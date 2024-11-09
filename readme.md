# linkedin-api-fetch <!-- omit from toc -->

> TypeScript client for LinkedIn's unofficial API.

<p>
  <a href="https://github.com/transitive-bullshit/linkedin-api/actions/workflows/main.yml"><img alt="Build Status" src="https://github.com/transitive-bullshit/linkedin-api/actions/workflows/main.yml/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/linkedin-api-fetch"><img alt="NPM" src="https://img.shields.io/npm/v/linkedin-api-fetch.svg" /></a>
  <a href="https://github.com/transitive-bullshit/linkedin-api/blob/main/license"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue" /></a>
  <a href="https://prettier.io"><img alt="Prettier Code Formatting" src="https://img.shields.io/badge/code_style-prettier-brightgreen.svg" /></a>
</p>

- [Intro](#intro)
- [Install](#install)
- [Usage](#usage)
  - [Authentication](#authentication)
  - [Rate Limiting](#rate-limiting)
  - [Proxies](#proxies)
- [Troubleshooting](#troubleshooting)
  - [`CHALLENGE` Errors](#challenge-errors)
  - [401 Errors](#401-errors)
- [TODO](#todo)
- [Disclaimer](#disclaimer)
- [License](#license)

## Intro

This package provides a HTTP API client for accessing LinkedIn's readonly Voyager APIs. These are the same APIs that the official LinkedIn webapp uses to fetch data about user profiles, companies, and jobs.

No official API access is required. All you need is a valid LinkedIn user account (email and password).

> [!IMPORTANT]
> This library is not officially supported by LinkedIn. Using this library might violate LinkedIn's Terms of Service. Use it at your own risk.

## Install

```sh
npm install linkedin-api-fetch
```

## Usage

```ts
import { LinkedInClient } from 'linkedin-api-fetch'

const linkedin = new LinkedInClient({
  email: 'todo@example.com', // defaults to LINKEDIN_EMAIL
  password: 'todo' // defaults to LINKEDIN_PASSWORD
})

const user = await linkedin.getProfile('fisch2')
const company = await linkedin.getCompany('microsoft')
const school = await linkedin.getSchool('brown-university')

const peopleSearchResults = await linkedin.searchPeople('travis fischer')
const companySearchResults = await linkedin.searchCompanies('openai')
```

LinkedIn's internal data format is pretty verbose, so these methods all normalize the raw responses into a more reasonable format. Most API methods include a `Raw` version to return the original data: `getProfileRaw`, `getCompanyRaw`, `getSchoolRaw`, etc.

### Authentication

`LinkedInClient` will authenticate lazily using the provided email and password, or you can authenticate eagerly by calling `LinkedInClient.ensureAuthenticated()`.

The resulting cookies are stored using [conf](https://github.com/sindresorhus/conf) in a platform-dependent user data directory. You can access the cookie data via `linkedin.config.path` which will point to a path on your filesystem.

Auth cookies are re-initialized automatically either when they expire or when the client runs into a `401`/`403` HTTP error. You can force the auth cookie to refresh manually by calling `linkedin.authenticate()` which returns a `Promise`.

If you want to force re-authentication and ignore the existing cookies, use `LinkedInClient.authenticate()`.

> [!IMPORTANT]
> I recommend not using your personal LinkedIn account credentials with any LinkedIn scraping library unless you don't care about the possibility of being banned. Create a throwaway account for testing purposes.

### Rate Limiting

It is highly recommended that you throttle your API requests to LinkedIn to avoid being blocked. The default `LinkedInClient` adds a random delay between 1-5 seconds before each API request in order to try and evade detection. The default throttle also enforces a low rate-limit. It's easy to customize this default rate limit by disabling the default `throttle` and overriding the default `ky` instance:

```ts
import { LinkedInClient } from 'linkedin-api-fetch'
import pThrottle from 'p-throttle'
import throttleKy from 'throttle-ky'
import ky from 'ky'

// Custom rate-limit allowing up to 1 request every 5 seconds
const throttle = pThrottle({
  limit: 1,
  interval: 5 * 1000
})

const linkedin = new LinkedInClient({
  // Override the default `ky` instance which all API requests will use
  ky: throttleKy(ky, throttle),

  // Disable the default throttling
  throttle: false
})
```

### Proxies

The easiest way to use a proxy with Node.js `fetch` is via undici's [EnvHttpProxyAgent](https://github.com/nodejs/undici/blob/main/docs/docs/api/EnvHttpProxyAgent.md), which will respect the `http_proxy`, `https_proxy`, and `no_proxy` environment variables.

```sh
npm install undici
```

```ts
import { LinkedInClient } from 'linkedin-api-fetch'
import { EnvHttpProxyAgent } from 'undici'
import ky from 'ky'

const linkedin = new LinkedInClient({
  ky: ky.extend({
    dispatcher: new EnvHttpProxyAgent() as any
  })
})
```

## Troubleshooting

### `CHALLENGE` Errors

LinkedIn will sometimes respond to authentication requests with a Challenge URL. This can happen if LinkedIn suspects your account is being used programatically (possibly a combination of IP-based, usage-based, and/or workload-based).

If you get a `CHALLENGE` error, you'll need to manually log out and log back in to your account using a browser.

**Known reasons for Challenge** include:

- 2FA
- Rate-limit - "It looks like you’re visiting a very high number of pages on LinkedIn.". Note - n=1 experiment where this page was hit after ~900 contiguous requests in a single session (within the hour) (these included random delays between each request), as well as a bunch of testing, so who knows the actual limit.

### 401 Errors

If you get a 401 error when trying to authenticate, you likely need to log in via your browser. LinkedIn will sometimes see traffic as suspicious and require a combination of email code verification and CAPTCHA.

Once you can log in via a browser with being challenged with additional auth, then this library should be able to authenticate properly.

## TODO

- `searchJobs()`
- port more methods from the python version https://github.com/tomquirk/linkedin-api

## Disclaimer

This library is not endorsed or supported by LinkedIn. It is an unofficial library intended for educational purposes and personal use only. By using this library, you agree to not hold the author or contributors responsible for any consequences resulting from its usage.

## License

MIT © [Travis Fischer](https://x.com/transitive_bs)

This package is a TypeScript port of the popular [Python linkedin-api](https://github.com/tomquirk/linkedin-api).

If you found this project helpful, please consider starring it and [following me on Twitter](https://x.com/transitive_bs).
