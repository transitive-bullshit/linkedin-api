#!/usr/bin/env node
import 'dotenv/config'

import { LinkedInClient } from '../src'

/**
 * Scratch pad for testing.
 */
async function main() {
  const linkedin = new LinkedInClient()

  // await linkedin.authenticate()
  console.log(linkedin.config.path)

  // const res = await linkedin.getProfile('fisch2')
  // const res = await linkedin.getProfileExperiences(
  //   'ACoAAAdVCacB9uO3u3vDtvGPnDQeweefI2nV0gw'
  // )

  // await linkedin.authenticate()
  // console.log('authenticated', linkedin.config.get('cookies'))

  // const res = await linkedin.getMe()
  const res = await linkedin.getSchool('brown-university')
  // const res = await linkedin.getSchool('157343')
  // const res = await linkedin.getSchool('urn:li:fs_normalized_company:157343')
  // const res = await linkedin.getCompany('microsoft')
  // const res = await linkedin.getProfileUpdates(
  //   'fisch2'
  // )
  // const res = await linkedin.searchPeople('travis fischer')
  // const res = await linkedin.searchCompanies('automagical ai video')
  console.log(JSON.stringify(res, null, 2))
}

try {
  await main()
} catch (err) {
  console.error('error', err)
  process.exit(1)
}
