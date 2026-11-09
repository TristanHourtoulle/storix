import { describe, expect, it } from 'vitest'
import { CARD_TIERS } from './cards'
import { encodeCollectionCursor, parseCollectionCursor } from './collection-cursor'

describe('collection cursor', () => {
  it('round-trips every tier', () => {
    for (const tier of CARD_TIERS) {
      const cursor = { tier, number: 42 }
      expect(parseCollectionCursor(encodeCollectionCursor(cursor))).toEqual(cursor)
    }
  })

  it('encodes as tier.number', () => {
    expect(encodeCollectionCursor({ tier: 'mythic', number: 7 })).toBe('mythic.7')
  })

  it.each([
    '',
    '42',
    'mythic',
    'mythic.',
    '.42',
    'shiny.42',
    'rare.0',
    'rare.-1',
    'rare.01',
    'rare.4.2',
    'rare.1e3',
    'rare.2147483648',
    'Rare.42',
  ])('rejects %j', (raw) => {
    expect(parseCollectionCursor(raw)).toBeNull()
  })

  it('accepts the largest card number', () => {
    expect(parseCollectionCursor('common.2147483647')).toEqual({
      tier: 'common',
      number: 2_147_483_647,
    })
  })
})
