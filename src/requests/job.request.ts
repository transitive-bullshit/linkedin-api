import { LinkedInRequest } from "../core/linkedin-request.js";
import { LinkedInAuth } from '../core/linkedin-auth.js'

import {
  getIdFromUrn,
  isLinkedInUrn
} from '../core/linkedin-utils.js'
 
export class JobRequest{
    private request: LinkedInRequest
    private auth: LinkedInAuth
    constructor(request: LinkedInRequest, auth: LinkedInAuth) {
        this.request = request
        this.auth = auth
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

  await this.auth.ensureAuthenticated()

  const res = await this.request.apiKy
    .get(`jobs/jobPostings/${jobId}`, {
      searchParams: {
        decorationId:
          'com.linkedin.voyager.deco.jobs.web.shared.WebLightJobPosting-23'
      }
    })
    .json<any>()

  return res
}
    
}