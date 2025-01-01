import { LinkedInRequest } from "../core/linkedin-request.js";
import { LinkedInAuth } from '../core/linkedin-auth.js'
import { LinkedInClient } from "../core/linkedin-client.js";

import type {
  Organization,
  RawOrganization,
  RawOrganizationResponse,
} from '../types/index.js'
import {
  getIdFromUrn,
  isLinkedInUrn,
  normalizeRawOrganization,
} from '../core/linkedin-utils.js'

 
export class SchoolRequest{
    private request: LinkedInRequest
    private auth: LinkedInAuth

    constructor(request: LinkedInRequest, auth: LinkedInAuth) {
        this.request = request
        this.auth = auth
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

    
}