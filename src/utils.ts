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

export function encodeCookies(cookie: Record<string, string>): string {
  return Object.entries(cookie)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')
}

export function getIdFromUrn(urn?: string) {
  return urn?.split(':').at(-1)
}
