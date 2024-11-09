import 'dotenv/config'

import ky from 'ky'
import { EnvHttpProxyAgent } from 'undici'
import { beforeAll, describe, expect, test } from 'vitest'

import { LinkedInClient } from './linkedin-client'

describe('LinkedInClient', () => {
  let linkedin: LinkedInClient

  beforeAll(async () => {
    linkedin = new LinkedInClient({
      ky: ky.extend({
        dispatcher: new EnvHttpProxyAgent() as any
      })
    })

    await linkedin.ensureAuthenticated()
  })

  test(
    'getMe()',
    {
      timeout: 30_000
    },
    async () => {
      const res = await linkedin.getMe()
      expect(res.miniProfile.entityUrn).toBeTruthy()
      expect(res.miniProfile.firstName).toBeTruthy()
      expect(res.miniProfile.lastName).toBeTruthy()
    }
  )

  test(
    "getProfile('fisch2')",
    {
      timeout: 30_000
    },
    async () => {
      const res = await linkedin.getProfile('fisch2')
      expect(res.firstName).toBe('Travis')
      expect(res.lastName).toBe('Fischer')
      expect(res.id).toBe('ACoAAAdVCacB9uO3u3vDtvGPnDQeweefI2nV0gw')
    }
  )

  test(
    "getProfileExperiences('fisch2')",
    {
      timeout: 30_000
    },
    async () => {
      const res = await linkedin.getProfileExperiences(
        'ACoAAAdVCacB9uO3u3vDtvGPnDQeweefI2nV0gw'
      )
      expect(res.length).toBeGreaterThanOrEqual(5)
    }
  )

  test(
    "getSchool('brown-university')",
    {
      timeout: 30_000
    },
    async () => {
      const res = await linkedin.getSchool('brown-university')
      expect(res.name).toBe('Brown University')
      expect(res.id).toBe('157343')
    }
  )

  test(
    "getCompany('microsoft')",
    {
      timeout: 30_000
    },
    async () => {
      const res = await linkedin.getCompany('microsoft')
      expect(res.name).toBe('Microsoft')
      expect(res.id).toBe('1035')
    }
  )
})
