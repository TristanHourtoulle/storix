import { describe, expect, it } from 'vitest'
import { compensateRemovedCopies } from './compensation'

describe('compensateRemovedCopies', () => {
  it('compensates each owner from tier at mint, foil doubled, sorted by owner', () => {
    const result = compensateRemovedCopies([
      { ownerId: 'u2', cardId: 'c1', tierAtMint: 'rare', variant: 'normal' },
      { ownerId: 'u1', cardId: 'c1', tierAtMint: 'common', variant: 'foil' },
      { ownerId: 'u2', cardId: 'c2', tierAtMint: 'legendary', variant: 'foil' },
      { ownerId: 'u2', cardId: 'c1', tierAtMint: 'epic', variant: 'foil' },
    ])
    expect(result).toEqual([
      { ownerId: 'u1', dust: 10, perCard: [{ cardId: 'c1', dust: 10 }] },
      {
        ownerId: 'u2',
        dust: 1025,
        perCard: [
          { cardId: 'c1', dust: 225 },
          { cardId: 'c2', dust: 800 },
        ],
      },
    ])
  })

  it('returns nothing for no copies', () => {
    expect(compensateRemovedCopies([])).toEqual([])
  })

  it('does not mutate its input', () => {
    const copies = [
      { ownerId: 'b', cardId: 'x', tierAtMint: 'mythic', variant: 'normal' },
      { ownerId: 'a', cardId: 'x', tierAtMint: 'common', variant: 'normal' },
    ] as const
    const snapshot = JSON.stringify(copies)
    compensateRemovedCopies(copies)
    expect(JSON.stringify(copies)).toBe(snapshot)
  })
})
