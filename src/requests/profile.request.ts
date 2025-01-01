import { LinkedInRequest } from "../core/linkedin-request.js";

import type {
    EducationItem,
    ExperienceItem,
    Profile,
    ProfileContactInfo,
    ProfileSkills,
    ProfileView,
    SelfProfile
  } from '../types/index.js'
  import {
    getGroupedItemId,
    getIdFromUrn,
    isLinkedInUrn,
    parseExperienceItem,
    resolveLinkedVectorImageUrl,
    stringifyLinkedInDate
  } from '../core/linkedin-utils.js'
  
  import { LinkedInAuth } from '../core/linkedin-auth.js'
  
import { LinkedInClient } from "../core/linkedin-client.js";
 
export class ProfileRequest{
    private request: LinkedInRequest
    private auth: LinkedInAuth
    constructor(request: LinkedInRequest, auth: LinkedInAuth) {
        this.request = request
        this.auth = auth
    }

/**
   * Fetches basic profile information for the authenticated user.
   */
async getMe() {
    await this.auth.ensureAuthenticated()

    const res = await this.request.apiKy.get('me')

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

    await this.auth.ensureAuthenticated()

    // NOTE: the `/profileView` sub-route returns more detailed data.
    return this.request.apiKy
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

    await this.auth.ensureAuthenticated()

    return this.request.apiKy
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

    await this.auth.ensureAuthenticated()

    return this.request.apiKy
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

    await this.auth.ensureAuthenticated()

    const profileUrn = `urn:li:fsd_profile:${urnId}`
    const variables = [
      `profileUrn:${encodeURIComponent(profileUrn)}`,
      'sectionType:experience'
    ].join(',')
    const queryId =
      'voyagerIdentityDashProfileComponents.7af5d6f176f11583b382e37e5639e69e'

    const data = await this.request.apiKy
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

    const res = await this.request.apiKy
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
    
}