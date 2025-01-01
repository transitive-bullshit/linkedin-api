import 'dotenv/config'
import ky from 'ky'
import { LinkedInAuth } from '../../src/core/linkedin-auth.js'
import { ConsoleLogger } from '../../src/utils/logger/console-logger.js'

describe('LinkedInClient', () => {
  let linkedinAuth: LinkedInAuth

  beforeAll(async () => {
    linkedinAuth = new LinkedInAuth({
      logger: new ConsoleLogger(),
      ky: ky.extend({
        /*
        dispatcher: new EnvHttpProxyAgent() as any,
        timeout: 60_000 
        */
      })
    })
  })

  it('authenticate()', async () => {
      const res = await linkedinAuth.authenticate()
      expect(res).toBeTruthy()
    }, 30_000
  )

  it('ensureAuthenticated()', async () => {
    const res = await linkedinAuth.ensureAuthenticated()
    expect(res).toBeTruthy()
  }, 30_000
)

})
