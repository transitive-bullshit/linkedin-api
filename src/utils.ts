import type { SetCookie } from 'cookie-es'
import Conf from 'conf'

export function getConfigForUser(username: string) {
  return new Conf({ projectName: `linkedin-api`, configName: username })
}

export function getEnv(name: string): string | undefined {
  try {
    return typeof process !== 'undefined'
      ? // eslint-disable-next-line no-process-env
        process.env?.[name]
      : undefined
  } catch {
    return undefined
  }
}

export function encodeCookies(cookies: Record<string, SetCookie>): string {
  return Object.values(cookies)
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ')
}

/**
 * Return the ID of a given Linkedin URN.
 *
 * Example: urn:li:fs_miniProfile:<id>
 */
export function getIdFromUrn(urn?: string) {
  return urn?.split(':').at(-1)
}

/**
 * Return the URN of a raw group update
 *
 * Example: urn:li:fs_miniProfile:<id>
 * Example: urn:li:fs_updateV2:(<urn>,GROUP_FEED,EMPTY,DEFAULT,false)
 */
export function getUrnFromRawUpdate(update?: string) {
  return update?.split('(')[1]?.split(',').at(0)?.trim()
}

export function isLinkedInUrn(urn?: string) {
  return urn?.startsWith('urn:li:') && urn.split(':').length >= 4
}
