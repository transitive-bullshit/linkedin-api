
import 'dotenv/config'
import ky from 'ky'
import { LinkedInClient } from '../../src/index.js'
import { ConsoleLogger } from '../../src/utils/logger/console-logger.js'

describe('LinkedInClient', () => {
  let linkedin: LinkedInClient

  beforeAll(async () => {
    linkedin = new LinkedInClient({
      logger: new ConsoleLogger(),
      ky: ky.extend({
        /*
        dispatcher: new EnvHttpProxyAgent() as any,
        */
      })
    })

    await linkedin.ensureReady()
  })

  it('getMe()', async () => {
      const res = await linkedin.profile.getMe()
      console.log('First name: ' + res.miniProfile.firstName + ', Last name: ' + res.miniProfile.lastName)
      expect(res.miniProfile.entityUrn).toBeTruthy()
      expect(res.miniProfile.firstName).toBeTruthy()
      expect(res.miniProfile.lastName).toBeTruthy()
    }, 30_000
  )

  it("getProfile('fisch2')", async () => {
      const res = await linkedin.profile.getProfile('fisch2')
      expect(res.firstName).toBe('Travis')
      expect(res.lastName).toBe('Fischer')
      expect(res.id).toBe('ACoAAAdVCacB9uO3u3vDtvGPnDQeweefI2nV0gw')
    }, 30_000
  )

  it(
    "getProfileExperiences('fisch2')", async () => {
      const res = await linkedin.profile.getProfileExperiences(
        'ACoAAAdVCacB9uO3u3vDtvGPnDQeweefI2nV0gw'
      )
      expect(res.length).toBeGreaterThanOrEqual(5)
    }, 30_000
  )

  it("getSchool('brown-university')", 
    async () => {
      const res = await linkedin.school.getSchool('brown-university')
      expect(res.name).toBe('Brown University')
      expect(res.id).toBe('157343')
    }, 30_000
  )

  it("getCompany('microsoft')", 
    async () => {
      const res = await linkedin.company.getCompany('microsoft')
      expect(res.name).toBe('Microsoft')
      expect(res.id).toBe('1035')
    }, 30_000
  )
})
