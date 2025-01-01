import { rangeDelay } from 'delay'
import defaultKy, { type KyInstance } from 'ky'
import pThrottle from 'p-throttle'
import { Logger } from "../utils/logger/logger.js"
import { Client } from './linkedin-client.js'

// Allow up to 1 request per second by default.
const defaultThrottle = pThrottle({
    limit: 1,
    interval: 1000
  })

export class LinkedInRequest {
    private _apiKy: KyInstance
    private logger: Logger | null
    private client?: Client
    
    constructor({
        client,
        baseUrl = 'https://www.linkedin.com',
        ky = defaultKy,
        throttle = true,
        logger = null,
        apiHeaders = {},
      }: {
        client?: Client
        baseUrl?: string
        ky?: KyInstance
        throttle?: boolean
        logger?: Logger | null
        apiHeaders?: Record<string, string>
        authHeaders?: Record<string, string>
      } = {}) {

        this.client = client
        this.logger = logger
        
        this._apiKy = ky.extend({
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
                  this.logger?.log(JSON.stringify(response, null, 2))
                  try {
                    // Attempt to automatically re-authenticate after receiving an auth error.
                    if (response.status === 403 || response.status === 401) {
                      this.logger?.log(
                        'LinkedInClient: auth error (attempting to re-authenticate)',
                        {
                          method: request.method,
                          url: request.url,
                          status: response.status
                          // responseHeaders: Object.fromEntries(response.headers.entries())
                        }
                      )
      
                        try {
                        assert(this.client, "LinkedInRequest: Client not defined")
                          const headers = await this.client.reAuthenticateAndSetHeaders()
                          if (headers) {
                           // Update the failed request after successfully re-authenticating.
                          request.headers.set('csrf-token', headers['csrf-token'])
                          request.headers.set('cookie', headers.cookie)
                          } else {
                            return response
                          }
                        } catch (err: any) {
                          this.logger?.warn(
                            `LinkedInRequest: auth error ${response.status} from request ${request.method} ${request.url} error re-authenticating: ${err.message}`
                          )
                          return response
                        }
      
                        return await ky(request)
                      
                    }
                  } catch (err) {
                    this.logger?.error(
                      'LinkedInRequest: unhandled auth error',
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

    get apiKy(): KyInstance {
        return this._apiKy;
      }

      updateApiKyHeaders(csrfToken: string, encodedCookies: string) {

        // Update apiKy instance headers
        this._apiKy = this._apiKy.extend({
          headers: {
            'csrf-token': csrfToken,
            cookie: encodedCookies
          }
        })
      }


}