import type Conf from 'conf'
import { parseSetCookie, splitSetCookieString } from 'cookie-es'
import defaultKy, { type KyInstance } from 'ky'

import type {
  ExperienceItem,
  LinkedInMetadata,
  ProfileContactInfo,
  ProfileSkills,
  ProfileView,
  SelfProfile,
  VectorImage
} from './types'
import { assert } from './assert'
import { encodeCookies, getConfigForUser, getEnv, getIdFromUrn } from './utils'

export class LinkedInClient {
  // max seems to be 100 posts per page
  static readonly MAX_POST_COUNT = 100

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
  protected _cookies: Record<string, string> = {}
  protected _sessionId?: string
  protected _metadata?: LinkedInMetadata
  protected _authenticated = false

  constructor({
    username = getEnv('LINKEDIN_USERNAME'),
    password = getEnv('LINKEDIN_PASSWORD'),
    baseUrl = 'https://www.linkedin.com',
    ky = defaultKy,
    apiHeaders = {},
    authHeaders = {}
  }: {
    username?: string
    password?: string
    baseUrl?: string
    ky?: KyInstance
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
      }
    })
  }

  get authenticated() {
    return this._authenticated
  }

  async ensureAuthenticated() {
    if (this._authenticated) return

    const setCookies = this.config.get('cookies') as string
    if (setCookies) {
      // TODO: check if cookies are still valid
      this._setAuthCookies(setCookies)
      this._authenticated = true
    } else {
      await this.authenticate()
    }
  }

  protected async _getAuthCookieString() {
    const res0 = await this.authKy.get('uas/authenticate')
    const cookieString = res0.headers.get('set-cookie')
    assert(cookieString)

    return cookieString
  }

  protected async _setAuthCookies(setCookiesString: string) {
    assert(
      setCookiesString,
      'LinkedInClient authenticate missing set-cookie header'
    )

    const setCookies = splitSetCookieString(setCookiesString)
    // eslint-disable-next-line unicorn/no-array-reduce
    this._cookies = setCookies.reduce(
      (acc, c) => {
        const parsed = parseSetCookie(c)
        return {
          ...acc,
          [parsed.name]: parsed.value
        }
      },
      {} as Record<string, string>
    )

    const sessionId = this._cookies.JSESSIONID!
    assert(sessionId, 'LinkedInClient authenticate missing JSESSIONID cookie')
    this._sessionId = sessionId
    const csrfToken = sessionId.replaceAll('"', '')

    this.authKy = this.authKy.extend({
      headers: {
        'csrf-token': csrfToken,
        cookie: encodeCookies(this._cookies)
      }
    })

    this.apiKy = this.apiKy.extend({
      headers: {
        'csrf-token': csrfToken,
        cookie: encodeCookies(this._cookies)
      }
    })
  }

  async authenticate() {
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
        `LinkedInClient authenticate challenge error: ${data.login_result}`
      )
    }

    // TODO: handle challenge_url

    const setCookies = res.headers.get('set-cookie')!
    this._setAuthCookies(setCookies)
    this.config.set('cookies', setCookies)
    this._authenticated = true
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
   * @param id The LinkedIn user's public identifier or internal URN ID.
   */
  async getProfile(id: string) {
    await this.ensureAuthenticated()

    // NOTE: this still works for now, but will probably eventually have to be converted to
    // https://www.linkedin.com/voyager/api/identity/profiles/ACoAAAKT9JQBsH7LwKaE9Myay9WcX8OVGuDq9Uw
    return this.apiKy
      .get(`identity/profiles/${id}/profileView`)
      .json<ProfileView>()
  }

  /**
   * @param id The target LinkedIn user's public identifier or internal URN ID.
   */
  async getProfileContactInfo(id: string) {
    await this.ensureAuthenticated()

    return this.apiKy
      .get(`identity/profiles/${id}/profileContactInfo`)
      .json<ProfileContactInfo>()
  }

  /**
   * @param id The target LinkedIn user's public identifier or internal URN ID.
   */
  async getProfileSkills(id: string) {
    await this.ensureAuthenticated()

    return this.apiKy
      .get(`identity/profiles/${id}/skills`)
      .json<ProfileSkills>()
  }

  /**
   * @param urnId The target LinkedIn user's internal URN ID.
   */
  async getProfileExperiences(urnId: string) {
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
          parsedData.locationName = location
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
   * Fetches basic data about a school on LinkedIn.
   *
   * @param publicId The school's public LinkedIn identifier.
   */
  async getSchool(publicId: string) {
    await this.ensureAuthenticated()

    const res = await this.apiKy
      .get('organization/companies', {
        searchParams: {
          decorationId:
            'com.linkedin.voyager.deco.organization.web.WebFullCompanyMain-12',
          q: 'universalName',
          universalName: publicId
        }
      })
      // TODO
      .json<any>()

    return res.elements[0]
  }

  /**
   * Fetches basic data about a company on LinkedIn.
   *
   * @param publicId The company's public LinkedIn identifier.
   */
  async getCompany(publicId: string) {
    await this.ensureAuthenticated()

    const res = await this.apiKy
      .get('organization/companies', {
        searchParams: {
          decorationId:
            'com.linkedin.voyager.deco.organization.web.WebFullCompanyMain-12',
          q: 'universalName',
          universalName: publicId
        }
      })
      // TODO
      .json<any>()

    return res.elements[0]
  }
}

function parseExperienceItem(
  item: any,
  { isGroupItem = false, included }: { isGroupItem?: boolean; included: any[] }
): ExperienceItem {
  const component = item.components.entityComponent
  const title = component.titleV2.text.text
  const subtitle = component.subtitle
  const subtitleParts = subtitle?.text?.split(' · ')
  const company = subtitleParts?.[0]
  const employmentType = subtitleParts?.[1]
  const companyId: string | undefined =
    getIdFromUrn(component.image?.attributes?.[0]?.['*companyLogo']) ??
    component.image?.actionTarget?.split('/').findLast(Boolean)
  let companyImage: string | undefined

  if (companyId) {
    const companyEntity = included.find((i: any) =>
      i.entityUrn?.endsWith(companyId)
    )

    if (companyEntity) {
      companyImage = resolveImageUrl(
        companyEntity.logoResolutionResult?.vectorImage
      )
    }
  }

  const metadata = component?.metadata || {}
  const location = metadata?.text

  const durationText = component.caption?.text
  const durationParts = durationText?.split(' · ')
  const dateParts = durationParts?.[0]?.split(' - ')

  const duration = durationParts?.[1]
  const startDate = dateParts?.[0]
  const endDate = dateParts?.[1]

  const subComponents = component.subComponents
  const fixedListComponent =
    subComponents?.components?.[0]?.components?.fixedListComponent

  const fixedListTextComponent =
    fixedListComponent?.components?.[0]?.components?.textComponent

  const description = fixedListTextComponent?.text?.text

  const parsedData: ExperienceItem = {
    title,
    companyName: !isGroupItem ? company : undefined,
    companyImage,
    companyId,
    employmentType: isGroupItem ? company : employmentType,
    locationName: location,
    duration,
    startDate,
    endDate,
    description
  }

  return parsedData
}

function getGroupedItemId(item: any): string | undefined {
  const subComponents = item.components?.entityComponent?.subComponents
  const subComponentsComponents = subComponents?.components?.[0]?.components

  const pagedListComponentId = subComponentsComponents?.['*pagedListComponent']

  if (pagedListComponentId?.includes('fsd_profilePositionGroup')) {
    const pattern = /urn:li:fsd_profilePositionGroup:\([\dA-z]+,[\dA-z]+\)/
    const match = pagedListComponentId.match(pattern)
    return match?.[0]
  }

  return undefined
}

export function resolveImageUrl(vectorImage?: VectorImage): string | undefined {
  if (!vectorImage?.rootUrl) return
  if (!vectorImage.artifacts?.length) return

  // eslint-disable-next-line unicorn/no-array-reduce
  const largestArtifact = vectorImage.artifacts.reduce((a, b) => {
    if (b.width > a.width) return b
    return a
  }, vectorImage.artifacts[0]!)

  if (!largestArtifact.fileIdentifyingUrlPathSegment) return

  return `${vectorImage.rootUrl}${largestArtifact.fileIdentifyingUrlPathSegment}`
}
