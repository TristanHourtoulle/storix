import { describe, expect, it } from 'vitest'
import { canReact } from './reactions'

describe('canReact', () => {
  it('allows a non-author owning a copy', () =>
    expect(canReact({ isAuthor: false, ownsCopy: true })).toBe(true))
  it('rejects the author', () => {
    expect(canReact({ isAuthor: true, ownsCopy: true })).toBe(false)
    expect(canReact({ isAuthor: true, ownsCopy: false })).toBe(false)
  })
  it('rejects a member without a copy', () =>
    expect(canReact({ isAuthor: false, ownsCopy: false })).toBe(false))
})
