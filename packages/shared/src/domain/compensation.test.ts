import { describe, expect, it } from 'vitest'
import { compensateRemovedCopies } from './compensation'

describe('compensateRemovedCopies', () => {
  it('compensates each owner from tier at mint, foil doubled, sorted by owner', () => {
    const result = compensateRemovedCopies([
      { ownerId: 'u2', cardId: 'c1', tierAtMint: 'rare', variant: 'normal', promotedTier: null },
      { ownerId: 'u1', cardId: 'c1', tierAtMint: 'common', variant: 'foil', promotedTier: null },
      { ownerId: 'u2', cardId: 'c2', tierAtMint: 'legendary', variant: 'foil', promotedTier: null },
      { ownerId: 'u2', cardId: 'c1', tierAtMint: 'epic', variant: 'foil', promotedTier: null },
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

  it('compensates a promoted copy at its personal tier and every stacked copy', () => {
    const result = compensateRemovedCopies(
      [
        {
          ownerId: 'u1',
          cardId: 'c1',
          tierAtMint: 'rare',
          variant: 'normal',
          promotedTier: 'epic',
        },
      ],
      [
        { ownerId: 'u1', cardId: 'c1', variant: 'foil', tierAtMint: 'common', count: 3 },
        { ownerId: 'u2', cardId: 'c1', variant: 'normal', tierAtMint: 'rare', count: 2 },
      ],
    )
    expect(result).toEqual([
      { ownerId: 'u1', dust: 130, perCard: [{ cardId: 'c1', dust: 130 }] },
      { ownerId: 'u2', dust: 50, perCard: [{ cardId: 'c1', dust: 50 }] },
    ])
  })

  it('returns nothing for no copies', () => {
    expect(compensateRemovedCopies([])).toEqual([])
  })

  it('does not mutate its input', () => {
    const copies = [
      { ownerId: 'b', cardId: 'x', tierAtMint: 'mythic', variant: 'normal', promotedTier: null },
      { ownerId: 'a', cardId: 'x', tierAtMint: 'common', variant: 'normal', promotedTier: null },
    ] as const
    const snapshot = JSON.stringify(copies)
    compensateRemovedCopies(copies)
    expect(JSON.stringify(copies)).toBe(snapshot)
  })
})
