import 'dotenv/config'

import ky from 'ky'
import { EnvHttpProxyAgent } from 'undici'

import { LinkedInClient } from '../src'

/**
 * Scratch pad for testing.
 */
async function main() {
  const linkedin = new LinkedInClient({
    ky: ky.extend({
      dispatcher: new EnvHttpProxyAgent()
    })
  })

  // await linkedin.authenticate()
  // console.log(linkedin.config.path)

  const res = await linkedin.getProfile('fisch2')
  // const res = await linkedin.getProfileExperiences(
  //   'ACoAAAdVCacB9uO3u3vDtvGPnDQeweefI2nV0gw'
  // )

  // await linkedin.authenticate()
  // console.log('authenticated', linkedin.config.get('cookies'))

  // const res = await linkedin.getMe()
  // const res = await linkedin.getSchool('brown-university')
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

await main()
