import type { SetCookie } from 'cookie-es'
import Conf from 'conf'

export function assert(
  value: unknown,
  message?: string | Error
): asserts value {
  if (value) {
    return
  }

  if (!message) {
    throw new Error('Assertion failed')
  }

  throw typeof message === 'string' ? new Error(message) : message
}

export function getConfigForUser(email: string) {
  return new Conf({ projectName: 'linkedin-api', configName: email })
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
 * From `inputObj`, create a new object that does not include `keys`.
 *
 * @example
 * ```js
 * omit({ a: 1, b: 2, c: 3 }, 'a', 'c') // { b: 2 }
 * ```
 */
export const omit = <
  T extends Record<string, unknown> | object,
  K extends keyof any
>(
  inputObj: T,
  ...keys: K[]
): Omit<T, K> => {
  const keysSet = new Set(keys)
  return Object.fromEntries(
    Object.entries(inputObj).filter(([k]) => !keysSet.has(k as any))
  ) as any
}