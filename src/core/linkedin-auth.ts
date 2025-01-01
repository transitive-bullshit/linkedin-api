import type Conf from 'conf'
import { parseSetCookie, type SetCookie, splitSetCookieString } from 'cookie-es'
import defaultKy, { type KyInstance } from 'ky'

import { assert, encodeCookies, getConfigForUser, getEnv } from '../utils/index.js'
import { Logger } from '../utils/logger/logger.js'
import { Client } from './linkedin-client.js'

export class LinkedInAuth {
  // max seems to be 100 posts per page (currently unused)
  // static readonly MAX_POST_COUNT = 100

  // max seems to be 100
  static readonly MAX_UPDATE_COUNT = 100

  // max seems to be 49, and min seems to be 2
  static readonly MAX_SEARCH_COUNT = 49

  // very conservative max requests count to avoid rate-limit
  static readonly MAX_REPEATED_REQUESTS = 200

  public readonly email: string
  public readonly password: string
  public readonly config: Conf

  protected authKy: KyInstance
  protected logger: Logger | null
  private client?: Client

  protected _cookies?: Record<string, SetCookie>
  protected _sessionId?: string
  protected _isAuthenticated = false
  protected _isAuthenticating = false
  protected _isReauthenticating = false

  constructor({
    client,
    email = getEnv('LINKEDIN_EMAIL'),
    password = getEnv('LINKEDIN_PASSWORD'),
    baseUrl = 'https://www.linkedin.com',
    ky = defaultKy,
    logger = null,
    authHeaders = {}
  }: {
    client?: Client,
    email?: string
    password?: string
    baseUrl?: string
    ky?: KyInstance
    logger?: Logger | null
    authHeaders?: Record<string, string>
  } = {}) {
    assert(
      email,
      'LinkedInAuth missing required "email" (defaults to "LINKEDIN_EMAIL")'
    )
    assert(
      password,
      'LinkedInAuth missing required "password" (defaults to "LINKEDIN_PASSWORD")'
    )

    this.email = email
    this.password = password
    this.client = client
    this.logger = logger

    this.config = getConfigForUser(email)
    this.logger?.debug('LinkedInAuth: Constructor: ConfigForUser: ', JSON.stringify(this.config, null, 2))
    
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
  }

  get isAuthenticated() {
    return this._isAuthenticated
  }

  get cookies(): Record<string, SetCookie> | undefined {
    return this._cookies
  }

  get sessionId(): string | undefined {
    return this._sessionId
  }

  async ensureAuthenticated() {
    if (this._isAuthenticated) {
      this.logger?.log('LinkedInAuth: Is already authenticated');
      return
    } 

    const setCookies = this.config.get('cookies') as string
    if (setCookies) {
      try {
        this._setAuthCookies(setCookies)
        this._isAuthenticated = true
      } catch (err: any) {
        this.logger?.warn(
          'LinkedInAuth: Error renewing expired auth cookies',
          err.message
        )
        return this.authenticate()
      }
    } else {
      this.logger?.warn('LinkedInAuth: Is Authenticated, but cookies not defined')
      return this.authenticate()
    }
  }

  protected async _getAuthCookieString() {
    
    const res = await this.authKy.get('uas/authenticate')
    this.logger?.debug('LinkedInAuth: GET uas/authenticate', res)
    const cookieString = res.headers.get('set-cookie')
    this.logger?.log('LinkedInAuth: Did get set-cookie', cookieString)
    assert(cookieString)
    return cookieString
  }

  protected _setAuthCookies(setCookiesString: string) {
    assert(
      setCookiesString,
      'LinkedInAuth: authenticate missing set-cookie header'
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

    if (!sessionCookie) {
      this.logger?.error('LinkedInAuth: Session missing JSESSIONID cookie', {cookie: this.cookies})
      throw Error('LinkedInAuth: session missing JSESSIONID cookie')
    }

    if (sessionCookie.expires && Date.now() > sessionCookie.expires.getTime()) {
      this.logger?.error('LinkedInAuth: auth cookie expired', {sessionCookieExpires: sessionCookie.expires?.getTime()})
      throw new Error('LinkedInAuth: auth cookie expired')
    }

    this._sessionId = sessionCookie.value
    const csrfToken = this._sessionId.replaceAll('"', '')
    const encodedCookies = encodeCookies(this._cookies!)

    this.authKy = this.authKy.extend({
      headers: {
        'csrf-token': csrfToken,
        cookie: encodedCookies
      }
    })

    assert(this.client, "LinkedInAuth: Client not defined")
    this.client.updateApiKyHeaders(csrfToken, encodedCookies)
    return this._cookies
  }

  /** Returns true on successful authentication */
  async authenticate(): Promise<boolean> {
    this._isAuthenticating = true

    try {
      const authCookies = await this._getAuthCookieString()
      this._setAuthCookies(authCookies)
      assert(this._sessionId)

      const res = await this.authKy.post('uas/authenticate', {
        body: new URLSearchParams({
          session_key: this.email,
          session_password: this.password,
          JSESSIONID: this._sessionId!
        }),
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        }
      })

      if ( res.status !== 200) {
        this.logger?.debug('LinkedInAuth: POST uas/authenticate', res)
      }

      if (res.status === 401) {
        throw new Error(
          `LinkedInAuth: authenticate HTTP error: invalid credentials ${res.status}`
        )
      }

      if (res.status !== 200) {
        throw new Error(`LinkedInAuth: authenticate HTTP error: ${res.status}`)
      }

      const data = await res.json<{
        login_result?: string
        challenge_url?: string
      }>()

      if (data.login_result !== 'PASS') {
        throw new Error(
          `LinkedInAuth: authenticate challenge error: ${data.login_result} ${data.challenge_url}`
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
    return this._isAuthenticated
  }

  /** Returns null if can't reauthenticate because authentication already in progress */
  async reAuthenticateAndSetHeaders(): Promise<{ 'csrf-token': string, 'cookie': string } | null> {
    this._isAuthenticated = false

    if (this._isAuthenticating || this._isReauthenticating) {
      // Avoid infinite authentication loops
      return null
    }

    this._isReauthenticating = true

    try {

      await this.authenticate()

      assert(this._sessionId)
      assert(this._cookies)

      // Update the failed request after successfully re-authenticating.
      const csrfToken = this._sessionId.replaceAll('"', '')

      const headers = {
        'csrf-token': csrfToken,
        'cookie': encodeCookies(this._cookies)
      }

      return headers

    } finally {
      this._isReauthenticating = false
    }
  }



}