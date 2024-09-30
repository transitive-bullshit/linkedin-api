import { expect, test } from 'vitest'

import { omit } from './utils'

test('omit', () => {
  expect(omit({ a: 1, b: 2, c: 3 }, 'a', 'c')).toEqual({ b: 2 })
  expect(omit({ a: { b: 'foo' }, d: -1, foo: null }, 'b', 'foo')).toEqual({
    a: { b: 'foo' },
    d: -1
  })
  expect(omit({ a: 1, b: 2, c: 3 }, 'foo', 'bar', 'c')).toEqual({ a: 1, b: 2 })
})
