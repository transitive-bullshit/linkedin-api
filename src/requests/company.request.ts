import { LinkedInRequest } from "../core/linkedin-request.js";
import { LinkedInAuth } from '../core/linkedin-auth.js'
import { LinkedInClient } from "../core/linkedin-client.js";

import type { 
  Organization,
  RawOrganization,
  RawOrganizationResponse
} from '../types/index.js'

import {
  getIdFromUrn,
  isLinkedInUrn,
  normalizeRawOrganization,
  
} from '../core/linkedin-utils.js'
 
export class CompanyRequest{
    private request: LinkedInRequest
    private auth: LinkedInAuth
    constructor(request: LinkedInRequest, auth: LinkedInAuth) {
        this.request = request
        this.auth = auth
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

    await this.auth.ensureAuthenticated()

    const res = await this.request.apiKy
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

    const res = await this.request.apiKy
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
    
}