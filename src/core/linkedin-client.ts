import defaultKy, { type KyInstance } from 'ky'
import { LinkedInAuth } from './linkedin-auth.js'
import { Logger } from '../utils/logger/logger.js'
import { LinkedInRequest } from './linkedin-request.js'
import { ProfileRequest } from '../requests/profile.request.js'
import { CompanyRequest } from '../requests/company.request.js'
import { SchoolRequest } from '../requests/school.request.js'
import { JobRequest } from '../requests/job.request.js'
import { SearchRequest } from '../requests/search.request.js'

export interface Client {
  updateApiKyHeaders(csrfToken: string, encodedCookies: string): void
  reAuthenticateAndSetHeaders(): Promise<{ 'csrf-token': string, 'cookie': string } | null>
}

export class LinkedInClient implements Client {
  // max seems to be 100 posts per page (currently unused)
  // static readonly MAX_POST_COUNT = 100

  // max seems to be 100
  static readonly MAX_UPDATE_COUNT = 100

  // max seems to be 49, and min seems to be 2
  static readonly MAX_SEARCH_COUNT = 49

  // very conservative max requests count to avoid rate-limit
  static readonly MAX_REPEATED_REQUESTS = 200

  
  protected logger: Logger | null

  protected auth: LinkedInAuth
  private request: LinkedInRequest
  profile: ProfileRequest
  company: CompanyRequest
  school: SchoolRequest
  job: JobRequest
  search: SearchRequest

  constructor({
    email,
    password,
    baseUrl = 'https://www.linkedin.com',
    ky = defaultKy,
    throttle = true,
    logger = null,
    apiHeaders = {},
    authHeaders = {}
  }: {
    email?: string
    password?: string
    baseUrl?: string
    ky?: KyInstance
    throttle?: boolean
    logger?: Logger | null
    apiHeaders?: Record<string, string>
    authHeaders?: Record<string, string>
  } = {}) {

    this.logger = logger

    this.auth = new LinkedInAuth({
      client: this,
      email: email,
      password: password,
      baseUrl: baseUrl,
      ky: ky,
      logger: logger,
      authHeaders: authHeaders
    })

    this.request = new LinkedInRequest(
      {
        client: this,
        baseUrl: baseUrl,
        ky: ky,
        throttle: throttle,
        logger: logger,
        apiHeaders: apiHeaders,
      }
    )

    this.profile = new ProfileRequest(this.request, this.auth)
    this.company = new CompanyRequest(this.request, this.auth)
    this.school = new SchoolRequest(this.request, this.auth)
    this.job = new JobRequest(this.request, this.auth)
    this.search = new SearchRequest(this.request, this.auth)

  }

  async ensureReady() {
    return this.auth.ensureAuthenticated()
  }

  updateApiKyHeaders(csrfToken: string, encodedCookies: string) {
    this.request.updateApiKyHeaders(csrfToken, encodedCookies)
  }

  async reAuthenticateAndSetHeaders(): Promise<{ 'csrf-token': string, 'cookie': string } | null> {
    return this.auth.reAuthenticateAndSetHeaders()
  }

  

 

  
 
 

 
}