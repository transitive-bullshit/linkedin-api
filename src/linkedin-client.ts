import type Conf from 'conf'
import { parseSetCookie, type SetCookie, splitSetCookieString } from 'cookie-es'
import { rangeDelay } from 'delay'
import defaultKy, { type KyInstance } from 'ky'
import pThrottle from 'p-throttle'

import type {
  EducationItem,
  EntitySearchResult,
  ExperienceItem,
  Organization,
  Profile,
  ProfileContactInfo,
  ProfileSkills,
  ProfileView,
  RawOrganization,
  RawOrganizationResponse,
  SearchCompaniesParams,
  SearchCompaniesResponse,
  SearchParams,
  SearchPeopleParams,
  SearchPeopleResponse,
  SearchResponse,
  SelfProfile
} from './types'
import {
  getGroupedItemId,
  getIdFromUrn,
  getUrnFromRawUpdate,
  isLinkedInUrn,
  normalizeRawOrganization,
  parseExperienceItem,
  resolveImageUrl,
  resolveLinkedVectorImageUrl,
  stringifyLinkedInDate
} from './linkedin-utils'
import { assert, encodeCookies, getConfigForUser, getEnv } from './utils'

// Allow up to 1 request per second by default.
const defaultThrottle = pThrottle({
  limit: 1,
  interval: 1000
})

export class LinkedInClient {
  // max seems to be 100 posts per page (currently unused)
  // static readonly MAX_POST_COUNT = 100

  // max seems to be 100
  static readonly MAX_UPDATE_COUNT = 100

  // max seems to be 49, and min seems to be 2
  static readonly MAX_SEARCH_COUNT = 49

  // very conservative max requests count to avoid rate-limit
  static readonly MAX_REPEATED_REQUESTS = 200

  public readonly username: string
  public readonly password: string
  public readonly config: Conf

  protected authKy: KyInstance
  protected apiKy: KyInstance

  protected _cookies?: Record<string, SetCookie>
  protected _sessionId?: string
  protected _isAuthenticated = false
  protected _isAuthenticating = false
  protected _isReauthenticating = false

  constructor({
    username = getEnv('LINKEDIN_USERNAME'),
    password = getEnv('LINKEDIN_PASSWORD'),
    baseUrl = 'https://www.linkedin.com',
    ky = defaultKy,
    throttle = true,
    apiHeaders = {},
    authHeaders = {}
  }: {
    username?: string
    password?: string
    baseUrl?: string
    ky?: KyInstance
    throttle?: boolean
    apiHeaders?: Record<string, string>
    authHeaders?: Record<string, string>
  } = {}) {
    assert(
      username,
      'LinkedInClient missing required "username" (defaults to "LINKEDIN_USERNAME")'
    )
    assert(
      password,
      'LinkedInClient missing required "password" (defaults to "LINKEDIN_PASSWORD")'
    )

    this.username = username
    this.password = password
    this.config = getConfigForUser(username)

    this.authKy = ky.extend({
      prefixUrl: baseUrl,
      headers: {
        'x-li-user-agent':
          'LIAuthLibrary:0.0.3 com.linkedin.android:4.1.881 Asus_ASUS_Z01QD:android_9',
        'user-agent': 'ANDROID OS',
        'x-user-language': 'en',
        'x-user-locale': 'en_US',
        'accept-language': 'en-us',
        ...authHeaders
      }

      // Note that by default, auth requests are not throttled the same as
      // API requests.
    })

    this.apiKy = ky.extend({
      prefixUrl: `${baseUrl}/voyager/api`,
      headers: {
        'user-agent': [
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5)',
          'AppleWebKit/537.36 (KHTML, like Gecko)',
          'Chrome/83.0.4103.116 Safari/537.36'
        ].join(' '),
        'accept-language': 'en-AU,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
        'x-li-lang': 'en_US',
        'x-restli-protocol-version': '2.0.0',
        ...apiHeaders
      },
      hooks: {
        ...(throttle
          ? {
              beforeRequest: [
                async () => {
                  // Add a random delay before each API request in an attempt to
                  // avoid suspicion.
                  await rangeDelay(1000, 5000)
                },

                // Also enforce a default rate-limit.
                defaultThrottle(() => Promise.resolve(undefined))
              ]
            }
          : undefined),

        afterResponse: [
          async (request, _options, response) => {
            try {
              // Attempt to automatically re-authenticate after receiving an auth error.
              if (response.status === 403 || response.status === 401) {
                console.log(
                  'LinkedInClient auth error (attempting to re-authenticate)',
                  {
                    method: request.method,
                    url: request.url,
                    status: response.status
                    // responseHeaders: Object.fromEntries(response.headers.entries())
                  }
                )

                this._isAuthenticated = false

                if (this._isAuthenticating || this._isReauthenticating) {
                  // Avoid infinite authentication loops
                  return response
                }

                this._isReauthenticating = true

                try {
                  try {
                    await this.authenticate()
                  } catch (err: any) {
                    console.warn(
                      `LinkedInClient auth error ${response.status} from request ${request.method} ${request.url} error re-authenticating: ${err.message}`
                    )
                    return response
                  }

                  assert(this._sessionId)
                  assert(this._cookies)

                  // Update the failed request after successfully re-authenticating.
                  const csrfToken = this._sessionId.replaceAll('"', '')
                  request.headers.set('csrf-token', csrfToken)
                  request.headers.set('cookie', encodeCookies(this._cookies))

                  return await ky(request)
                } finally {
                  this._isReauthenticating = false
                }
              }
            } catch (err) {
              console.error(
                'LinkedInClient unhandled auth error',
                {
                  method: request.method,
                  url: request.url,
                  status: response.status
                },
                err
              )
            }
          }
        ]
      }
    })
  }

  get isAuthenticated() {
    return this._isAuthenticated
  }

  async ensureAuthenticated() {
    if (this._isAuthenticated) return

    const setCookies = this.config.get('cookies') as string
    if (setCookies) {
      try {
        this._setAuthCookies(setCookies)
        this._isAuthenticated = true
      } catch (err: any) {
        console.warn(
          'LinkedInClient renewing expired auth cookies',
          err.message
        )
        return this.authenticate()
      }
    } else {
      return this.authenticate()
    }
  }

  protected async _getAuthCookieString() {
    const res = await this.authKy.get('uas/authenticate')
    const cookieString = res.headers.get('set-cookie')
    assert(cookieString)

    return cookieString
  }

  protected async _setAuthCookies(setCookiesString: string) {
    assert(
      setCookiesString,
      'LinkedInClient authenticate missing set-cookie header'
    )

    const setCookies = splitSetCookieString(setCookiesString)
    const parsedCookies = setCookies.map((c) => parseSetCookie(c))

    this._cookies = parsedCookies.reduce<Record<string, SetCookie>>(
      (acc, c) => {
        return {
          ...acc,
          [c.name]: c
        }
      },
      {}
    )

    const sessionCookie = this._cookies.JSESSIONID
    assert(sessionCookie, 'LinkedInClient session missing JSESSIONID cookie')

    if (sessionCookie.expires && Date.now() > sessionCookie.expires.getTime()) {
      throw new Error('LinkedInClient auth cookie expired')
    }

    this._sessionId = sessionCookie.value
    const csrfToken = this._sessionId.replaceAll('"', '')

    this.authKy = this.authKy.extend({
      headers: {
        'csrf-token': csrfToken,
        cookie: encodeCookies(this._cookies!)
      }
    })

    this.apiKy = this.apiKy.extend({
      headers: {
        'csrf-token': csrfToken,
        cookie: encodeCookies(this._cookies!)
      }
    })

    return this._cookies
  }

  async authenticate() {
    this._isAuthenticating = true

    try {
      await this._setAuthCookies(await this._getAuthCookieString())
      assert(this._sessionId)

      const res = await this.authKy.post('uas/authenticate', {
        body: new URLSearchParams({
          session_key: this.username,
          session_password: this.password,
          JSESSIONID: this._sessionId!
        }),
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        }
      })

      if (res.status === 401) {
        throw new Error(
          `LinkedInClient authenticate HTTP error: invalid credentials ${res.status}`
        )
      }

      if (res.status !== 200) {
        throw new Error(`LinkedInClient authenticate HTTP error: ${res.status}`)
      }

      const data = await res.json<{
        login_result?: string
        challenge_url?: string
      }>()

      if (data.login_result !== 'PASS') {
        throw new Error(
          `LinkedInClient authenticate challenge error: ${data.login_result} ${data.challenge_url}`
        )
      }

      // TODO: handle challenge_url

      const setCookies = res.headers.get('set-cookie')!
      this._setAuthCookies(setCookies)
      this.config.set('cookies', setCookies)
      this._isAuthenticated = true
    } finally {
      this._isAuthenticating = false
    }
  }

  /**
   * Fetches basic profile information for the authenticated user.
   */
  async getMe() {
    await this.ensureAuthenticated()

    const res = await this.apiKy.get('me')

    return res.json<SelfProfile>()
  }

  /**
   * Fetches basic profile information for a given LinkedIn user.
   *
   * Returns the raw data from the LinkedIn API without normalizing it.
   *
   * @param id The LinkedIn user's public identifier or internal URN ID.
   */
  async getProfileRaw(id: string): Promise<ProfileView> {
    if (isLinkedInUrn(id)) {
      id = getIdFromUrn(id)!
    }

    await this.ensureAuthenticated()

    // NOTE: the `/profileView` sub-route returns more detailed data.
    return this.apiKy
      .get(`identity/profiles/${id}/profileView`)
      .json<ProfileView>()
  }

  /**
   * Fetches basic profile information for a given LinkedIn user.
   *
   * @param id The LinkedIn user's public identifier or internal URN ID.
   */
  async getProfile(id: string): Promise<Profile> {
    const res = await this.getProfileRaw(id)

    const { profile, educationView, positionView } = res
    const miniProfile = profile.miniProfile
    const education: Profile['education'] = educationView
      ? {
          paging: {
            offset: educationView.paging.start,
            count: educationView.paging.count,
            total: educationView.paging.total
          },
          elements: educationView.elements.map((item) => {
            const educationItem: EducationItem = {
              entityUrn: item.entityUrn,
              schoolName: item.schoolName,
              degreeName: item.degreeName,
              fieldOfStudy: item.fieldOfStudy,
              startDate: stringifyLinkedInDate(item.timePeriod?.startDate),
              endDate: stringifyLinkedInDate(item.timePeriod?.endDate),
              school: {
                name: item.school?.schoolName ?? item.schoolName,
                entityUrn: item.school?.entityUrn,
                id: getIdFromUrn(item.school?.entityUrn),
                active: item.school?.active,
                logo: resolveLinkedVectorImageUrl(item.school?.logo)
              }
            }

            return educationItem
          })
        }
      : undefined

    const experience: Profile['experience'] = positionView
      ? {
          paging: {
            offset: positionView.paging.start,
            count: positionView.paging.count,
            total: positionView.paging.total
          },
          elements: positionView.elements.map((item) => {
            const companyUrn =
              item.companyUrn ?? item.company?.miniCompany?.entityUrn!

            const experienceItem: ExperienceItem = {
              entityUrn: item.entityUrn,
              title: item.title,
              companyName: item.companyName,
              description: item.description,
              location: item.locationName,
              startDate: stringifyLinkedInDate(item.timePeriod?.startDate),
              endDate: stringifyLinkedInDate(item.timePeriod?.endDate),
              company: {
                entityUrn: companyUrn,
                id: getIdFromUrn(companyUrn),
                publicIdentifier: item.company?.miniCompany?.universalName,
                name: item.company?.miniCompany?.name ?? item.companyName,
                industry: item.company?.industries?.[0],
                logo: resolveLinkedVectorImageUrl(
                  item.company?.miniCompany?.logo
                ),
                employeeCountRange: item.company?.employeeCountRange
              }
            }

            return experienceItem
          })
        }
      : undefined

    // TODO: add other sections (skills, recommendations, etc.)
    const result: Profile = {
      id: getIdFromUrn(res.entityUrn)!,
      entityUrn: res.entityUrn,
      firstName: profile.firstName,
      lastName: profile.lastName,
      headline: profile.headline,
      summary: profile.summary,
      occupation: miniProfile?.occupation,
      location: profile.locationName,
      industryName: profile.industryName,
      industryUrn: profile.industryUrn,
      publicIdentifier: miniProfile?.publicIdentifier,
      trackingId: miniProfile?.trackingId,
      defaultLocale: profile.defaultLocale,
      backgroundImage: resolveLinkedVectorImageUrl(
        miniProfile?.backgroundImage
      ),
      image: resolveLinkedVectorImageUrl(miniProfile?.picture),
      education,
      experience
    }

    return result
  }

  /**
   * @param id The target LinkedIn user's public identifier or internal URN ID.
   */
  async getProfileContactInfo(id: string) {
    if (isLinkedInUrn(id)) {
      id = getIdFromUrn(id)!
    }

    await this.ensureAuthenticated()

    return this.apiKy
      .get(`identity/profiles/${id}/profileContactInfo`)
      .json<ProfileContactInfo>()
  }

  /**
   * @param id The target LinkedIn user's public identifier or internal URN ID.
   */
  async getProfileSkills(
    idOrOptions: string | { id: string; offset?: number; limit?: number }
  ) {
    const {
      id,
      offset = 0,
      limit = 100
    } = typeof idOrOptions === 'string' ? { id: idOrOptions } : idOrOptions

    const resolvedId = isLinkedInUrn(id) ? getIdFromUrn(id)! : id

    await this.ensureAuthenticated()

    return this.apiKy
      .get(`identity/profiles/${resolvedId}/skills`, {
        searchParams: {
          count: limit,
          start: offset
        }
      })
      .json<ProfileSkills>()
  }

  /**
   * @param urnId The target LinkedIn user's internal URN ID.
   */
  async getProfileExperiences(urnId: string): Promise<ExperienceItem[]> {
    if (isLinkedInUrn(urnId)) {
      urnId = getIdFromUrn(urnId)!
    }

    await this.ensureAuthenticated()

    const profileUrn = `urn:li:fsd_profile:${urnId}`
    const variables = [
      `profileUrn:${encodeURIComponent(profileUrn)}`,
      'sectionType:experience'
    ].join(',')
    const queryId =
      'voyagerIdentityDashProfileComponents.7af5d6f176f11583b382e37e5639e69e'

    const data = await this.apiKy
      .get(
        `graphql?variables=(${variables})&queryId=${queryId}&includeWebMeta=true`,
        {
          headers: {
            accept: 'application/vnd.linkedin.normalized+json+2.1'
          }
        }
      )
      .json<any>()

    const experienceItems: ExperienceItem[] = []
    const included = data.included
    if (!included) return experienceItems

    const elements = included[0]?.components?.elements

    for (const item of elements) {
      const groupedItemId = getGroupedItemId(item)

      if (groupedItemId) {
        const component = item.components.entityComponent
        const company = component.titleV2.text.text
        const location = component.caption?.text || null

        const group = data.included.find((i: any) =>
          i.entityUrn?.includes(groupedItemId)
        )
        if (!group) continue

        for (const groupItem of group.components.elements) {
          const parsedData = parseExperienceItem(groupItem, {
            isGroupItem: true,
            included
          })
          parsedData.companyName = company
          parsedData.location = location
          experienceItems.push(parsedData)
        }
      } else {
        // Parse the regular item
        const parsedData = parseExperienceItem(item, {
          included
        })
        experienceItems.push(parsedData)
      }
    }

    return experienceItems
  }

  /**
   * Fetch profile updates (newsfeed activity) for a given LinkedIn profile.
   *
   * @TODO This method is currently untested and may not be working.

   * @param id The target LinkedIn user's public identifier or internal URN ID.
   */
  async getProfileUpdates(
    idOrOptions: string | { id: string; offset?: number; limit?: number }
  ) {
    const {
      id,
      offset = 0,
      limit = LinkedInClient.MAX_UPDATE_COUNT
    } = typeof idOrOptions === 'string' ? { id: idOrOptions } : idOrOptions

    const res = await this.apiKy
      .get('feed/updates', {
        searchParams: {
          profileId: id,
          q: 'memberShareFeed',
          moduleKey: 'member-share',
          count: Math.max(2, Math.min(limit, LinkedInClient.MAX_UPDATE_COUNT)),
          start: offset
        }
      })
      // TODO
      .json<any>()

    return res.elements
  }

  /**
   * Fetch company updates (newsfeed activity) for a given LinkedIn company.
   *
   * @TODO This method is currently untested and may not be working.
   *
   * @param id The target LinkedIn company's public identifier or internal URN ID.
   */
  async getCompanyUpdates(
    idOrOptions: string | { id: string; offset?: number; limit?: number }
  ) {
    const {
      id,
      offset = 0,
      limit = LinkedInClient.MAX_UPDATE_COUNT
    } = typeof idOrOptions === 'string' ? { id: idOrOptions } : idOrOptions

    const res = await this.apiKy
      .get('feed/updates', {
        searchParams: {
          companyUniversalName: id,
          q: 'companyFeedByUniversalName',
          moduleKey: 'member-share',
          count: Math.max(2, Math.min(limit, LinkedInClient.MAX_UPDATE_COUNT)),
          start: offset
        }
      })
      // TODO
      .json<any>()

    return res.elements
  }

  /**
   * Fetches basic data about a school on LinkedIn. Returns the raw data from
   * the LinkedIn API without normalizing it.
   *
   * @param id The company's public LinkedIn identifier or internal URN ID. E.g. "brown-university"
   *
   * @note When using a URN, it should be the school company's entityUrn ID, not
   * the school's URN ID.
   */
  async getSchoolRaw(id: string): Promise<RawOrganization> {
    if (isLinkedInUrn(id)) {
      id = getIdFromUrn(id)!
    }

    await this.ensureAuthenticated()

    const res = await this.apiKy
      .get('organization/companies', {
        searchParams: {
          decorationId:
            'com.linkedin.voyager.deco.organization.web.WebFullCompanyMain-12',
          q: 'universalName',
          universalName: id
        }
      })
      .json<RawOrganizationResponse>()

    return res.elements[0]!
  }

  /**
   * Fetches basic data about a school on LinkedIn.
   *
   * @param id The company's public LinkedIn identifier or internal URN ID. E.g. "brown-university"
   *
   * @note When using a URN, it should be the school company's entityUrn ID, not
   * the school's URN ID.
   */
  async getSchool(id: string): Promise<Organization> {
    const rawOrganization = await this.getSchoolRaw(id)
    return normalizeRawOrganization(rawOrganization)
  }

  /**
   * Fetches basic data about a company on LinkedIn. Returns the raw data from
   * the LinkedIn API without normalizing it.
   *
   * @param id The company's public LinkedIn identifier or internal URN ID. E.g. "microsoft"
   */
  async getCompanyRaw(id: string): Promise<RawOrganization> {
    if (isLinkedInUrn(id)) {
      id = getIdFromUrn(id)!
    }

    await this.ensureAuthenticated()

    const res = await this.apiKy
      .get('organization/companies', {
        searchParams: {
          decorationId:
            'com.linkedin.voyager.deco.organization.web.WebFullCompanyMain-12',
          q: 'universalName',
          universalName: id
        }
      })
      .json<RawOrganizationResponse>()

    return res.elements[0]!
  }

  /**
   * Fetches basic data about a company on LinkedIn.
   *
   * @param id The company's public LinkedIn identifier or internal URN ID. E.g. "microsoft"
   */
  async getCompany(id: string): Promise<Organization> {
    const rawOrganization = await this.getCompanyRaw(id)
    return normalizeRawOrganization(rawOrganization)
  }

  /**
   * Fetches data about a job posting on LinkedIn.
   *
   * @param jobId The ID of the job posting.
   */
  async getJob(jobId: string) {
    if (isLinkedInUrn(jobId)) {
      jobId = getIdFromUrn(jobId)!
    }

    await this.ensureAuthenticated()

    const res = await this.apiKy
      .get(`jobs/jobPostings/${jobId}`, {
        searchParams: {
          decorationId:
            'com.linkedin.voyager.deco.jobs.web.shared.WebLightJobPosting-23'
        }
      })
      .json<any>()

    return res
  }

  /**
   * Raw search method for Linkedin.
   *
   * You probably want to use `searchPeople` or `searchCompanies` instead.
   */
  async search({
    offset = 0,
    limit = LinkedInClient.MAX_SEARCH_COUNT,
    ...opts
  }: SearchParams): Promise<SearchResponse> {
    await this.ensureAuthenticated()

    const response: SearchResponse = {
      paging: {
        offset,
        count: 0,
        total: -1
      },
      results: []
    }
    const params: any = {
      start: offset,
      count: Math.min(limit, LinkedInClient.MAX_SEARCH_COUNT),
      filters: 'List()',
      origin: 'GLOBAL_SEARCH_HEADER',
      ...opts
    }

    const keywords = params.query
      ? `keywords:${encodeURIComponent(params.query)},`
      : ''

    // graphql?variables=(start:0,origin:GLOBAL_SEARCH_HEADER,query:(keywords:kevin%20raheja%20heygen,flagshipSearchIntent:SEARCH_SRP,queryParameters:List((key:resultType,value:List(PEOPLE))),includeFiltersInResponse:false))&queryId=voyagerSearchDashClusters.bb967969ef89137e6dec45d038310505

    // TODO: make use of `limit`

    const uri =
      `graphql?variables=(start:${params.start},origin:${params.origin},` +
      `query:(${keywords}flagshipSearchIntent:SEARCH_SRP,` +
      `queryParameters:${params.filters},includeFiltersInResponse:false))` +
      `&queryId=voyagerSearchDashClusters.bb967969ef89137e6dec45d038310505`
    // console.log(uri)

    const res = await this.apiKy
      .get(uri, {
        headers: {
          accept: 'application/vnd.linkedin.normalized+json+2.1'
        }
      })
      .json<any>()
    // console.log(JSON.stringify(res, null, 2))

    const dataClusters = res?.data?.data?.searchDashClustersByAll
    if (!dataClusters) return response

    if (
      dataClusters.$type !== 'com.linkedin.restli.common.CollectionResponse'
    ) {
      return response
    }

    response.paging.count = dataClusters.paging.count
    response.paging.total = dataClusters.paging.total

    for (const element of dataClusters.elements ?? []) {
      if (
        element.$type !==
        'com.linkedin.voyager.dash.search.SearchClusterViewModel'
      ) {
        continue
      }

      for (const it of element.items ?? []) {
        if (it.$type !== 'com.linkedin.voyager.dash.search.SearchItem') {
          continue
        }

        const item = it?.item
        if (!item) continue

        let entity: EntitySearchResult | undefined = item.entityResult
        if (!entity) {
          const linkedEntityUrn = item['*entityResult']
          if (!linkedEntityUrn) continue

          entity = res.included?.find(
            (e: any) => e.entityUrn === linkedEntityUrn
          )
          if (!entity) continue
        }

        if (
          entity.$type !==
          'com.linkedin.voyager.dash.search.EntityResultViewModel'
        ) {
          continue
        }

        response.results.push(entity)
      }
    }

    return response
  }

  /**
   * Performs a search for people profiles on LinkedIn.
   *
   * Takes in a google-style search query or an object containing more fine-
   * grained search parameters.
   */
  async searchPeople(
    queryOrParams: string | SearchPeopleParams
  ): Promise<SearchPeopleResponse> {
    const { includePrivateProfiles = true, ...params } =
      typeof queryOrParams === 'string'
        ? { query: queryOrParams }
        : queryOrParams
    const filters: string[] = ['(key:resultType,value:List(PEOPLE))']

    if (params.connectionOf) {
      filters.push(`(key:connectionOf,value:List(${params.connectionOf}))`)
    }

    if (params.networkDepths) {
      const stringify = params.networkDepths.join(' | ')
      filters.push(`(key:network,value:List(${stringify}))`)
    } else if (params.networkDepth) {
      filters.push(`(key:network,value:List(${params.networkDepth}))`)
    }

    if (params.regions) {
      const stringify = params.regions.join(' | ')
      filters.push(`(key:geoUrn,value:List(${stringify}))`)
    }

    if (params.industries) {
      const stringify = params.industries.join(' | ')
      filters.push(`(key:industry,value:List(${stringify}))`)
    }

    if (params.currentCompany) {
      const stringify = params.currentCompany.join(' | ')
      filters.push(`(key:currentCompany,value:List(${stringify}))`)
    }

    if (params.pastCompanies) {
      const stringify = params.pastCompanies.join(' | ')
      filters.push(`(key:pastCompany,value:List(${stringify}))`)
    }

    if (params.profileLanguages) {
      const stringify = params.profileLanguages.join(' | ')
      filters.push(`(key:profileLanguage,value:List(${stringify}))`)
    }

    if (params.nonprofitInterests) {
      const stringify = params.nonprofitInterests.join(' | ')
      filters.push(`(key:nonprofitInterest,value:List(${stringify}))`)
    }

    if (params.schools) {
      const stringify = params.schools.join(' | ')
      filters.push(`(key:schools,value:List(${stringify}))`)
    }

    if (params.serviceCategories) {
      const stringify = params.serviceCategories.join(' | ')
      filters.push(`(key:serviceCategory,value:List(${stringify}))`)
    }

    // `Keywords` filter
    const keywordTitle = params.keywordTitle ?? params.title
    if (params.keywordFirstName) {
      filters.push(`(key:firstName,value:List(${params.keywordFirstName}))`)
    }

    if (params.keywordLastName) {
      filters.push(`(key:lastName,value:List(${params.keywordLastName}))`)
    }

    if (keywordTitle) {
      filters.push(`(key:title,value:List(${keywordTitle}))`)
    }

    if (params.keywordCompany) {
      filters.push(`(key:company,value:List(${params.keywordCompany}))`)
    }

    if (params.keywordSchool) {
      filters.push(`(key:school,value:List(${params.keywordSchool}))`)
    }

    const res = await this.search({
      offset: params.offset,
      limit: params.limit,
      filters: `List(${filters.join(',')})`,
      ...(params.query && { query: params.query })
    })

    const response: SearchPeopleResponse = {
      paging: res.paging,
      results: []
    }

    for (const result of res.results) {
      if (
        !includePrivateProfiles &&
        result.entityCustomTrackingInfo?.memberDistance === 'OUT_OF_NETWORK'
      ) {
        continue
      }

      const urnId = getIdFromUrn(getUrnFromRawUpdate(result.entityUrn))
      assert(urnId)

      const name = result.title?.text
      assert(name)

      const url = result.navigationUrl?.split('?')[0]
      assert(url)

      response.results.push({
        urnId,
        name,
        url,
        distance: result.entityCustomTrackingInfo?.memberDistance,
        jobTitle: result.primarySubtitle?.text,
        location: result.secondarySubtitle?.text,
        summary: result.summary?.text,
        image: resolveImageUrl(
          result.image?.attributes?.[0]?.detailData?.nonEntityProfilePicture
            ?.vectorImage
        )
      })
    }

    return response
  }

  /**
   * Performs a search for companies on LinkedIn.
   *
   * Takes in a google-style search query or an object containing more fine-
   * grained search parameters.
   */
  async searchCompanies(
    queryOrParams: string | SearchCompaniesParams
  ): Promise<SearchCompaniesResponse> {
    const params =
      typeof queryOrParams === 'string'
        ? { query: queryOrParams }
        : queryOrParams
    const filters: string[] = ['(key:resultType,value:List(COMPANIES))']

    // TODO: support more company filter options

    const res = await this.search({
      ...params,
      filters: `List(${filters.join(',')})`
    })

    const response: SearchCompaniesResponse = {
      paging: res.paging,
      results: []
    }

    for (const result of res.results) {
      const urn = getUrnFromRawUpdate(result.entityUrn) ?? result.trackingUrn
      assert(urn)

      if (!urn.includes('company:')) continue

      const urnId = getIdFromUrn(urn)
      assert(urnId)

      const name = result.title?.text
      assert(name)

      const url = result.navigationUrl?.split('?')[0]
      assert(url)

      const primarySubtitle = result.primarySubtitle?.text
      const [industry, location] = primarySubtitle?.split(' • ') ?? []
      const numFollowers = result.secondarySubtitle?.text?.split(' ')[0]?.trim()

      // TODO: parse insightsResolutionResults for an estimate of number of jobs
      response.results.push({
        urnId,
        name,
        url,
        industry,
        location,
        numFollowers,
        summary: result.summary?.text,
        image: resolveImageUrl(
          result.image?.attributes?.[0]?.detailData?.nonEntityCompanyLogo
            ?.vectorImage
        )
      })
    }

    return response
  }
}
