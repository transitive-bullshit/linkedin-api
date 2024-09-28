#!/usr/bin/env node
import 'dotenv/config'

// import { parseSetCookie, splitSetCookieString } from 'cookie-es'
import { LinkedInClient } from '../src'

/**
 * Scratch pad for testing.
 */
async function main() {
  const linkedin = new LinkedInClient()

  // const res = await linkedin.getProfile('fisch2')
  // const res = await linkedin.getProfileExperiences(
  //   'ACoAAAdVCacB9uO3u3vDtvGPnDQeweefI2nV0gw'
  // )

  // await linkedin.authenticate()
  // console.log('authenticated', linkedin.config.get('cookies'))

  // const res = await linkedin.getMe()
  const res = await linkedin.getSchool('brown-university')
  // const res = await linkedin.getCompany('microsoft')
  console.log(JSON.stringify(res, null, 2))
}

try {
  await main()
} catch (err) {
  console.error('error', err)
  process.exit(1)
}
