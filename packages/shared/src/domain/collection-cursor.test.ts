import { describe, expect, it } from 'vitest'
import { CARD_TIERS } from './cards'
import {
  cursorSort,
  encodeCollectionCursor,
  parseCollectionCursor,
  type CollectionCursor,
} from './collection-cursor'

describe('collection cursor', () => {
  it('round-trips every tier', () => {
    for (const tier of CARD_TIERS) {
      const cursor = { kind: 'rarity', tier, number: 42 } as const
      expect(parseCollectionCursor(encodeCollectionCursor(cursor))).toEqual(cursor)
    }
  })

  it('encodes each kind', () => {
    expect(encodeCollectionCursor({ kind: 'rarity', tier: 'mythic', number: 7 })).toBe('mythic.7')
    expect(
      encodeCollectionCursor({
        kind: 'discovered',
        discoveredAt: 1794200000123,
        tier: 'epic',
        number: 12,
      }),
    ).toBe('d.1794200000123.epic.12')
    expect(encodeCollectionCursor({ kind: 'undiscovered', number: 66 })).toBe('dl.66')
    expect(encodeCollectionCursor({ kind: 'number', number: 5 })).toBe('n.5')
  })

  it('round-trips every kind and every tier', () => {
    const cursors: CollectionCursor[] = [
      ...CARD_TIERS.flatMap((tier): CollectionCursor[] => [
        { kind: 'rarity', tier, number: 42 },
        { kind: 'discovered', discoveredAt: 1794200000123, tier, number: 42 },
        { kind: 'discovered', discoveredAt: 0, tier, number: 1 },
      ]),
      { kind: 'undiscovered', number: 42 },
      { kind: 'number', number: 42 },
    ]
    for (const cursor of cursors) {
      expect(parseCollectionCursor(encodeCollectionCursor(cursor))).toEqual(cursor)
    }
  })

  it('maps each kind to its sort', () => {
    expect(cursorSort({ kind: 'rarity', tier: 'rare', number: 1 })).toBe('rarity')
    expect(cursorSort({ kind: 'discovered', discoveredAt: 1, tier: 'rare', number: 1 })).toBe(
      'discovery',
    )
    expect(cursorSort({ kind: 'undiscovered', number: 1 })).toBe('discovery')
    expect(cursorSort({ kind: 'number', number: 1 })).toBe('number')
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
    'd',
    'd.123',
    'd.123.epic',
    'd.-1.epic.4',
    'd.01.epic.4',
    'd.1.shiny.4',
    'd.1.epic.0',
    'd.9000000000000000.epic.4',
    'd.253402300800000.epic.4',
    'd.8640000000000000.common.1',
    'dl',
    'dl.0',
    'dl.epic',
    'n',
    'n.0',
    'n.4.2',
    'N.4',
    'd.1.epic.4.5',
  ])('rejects %j', (raw) => {
    expect(parseCollectionCursor(raw)).toBeNull()
  })

  it('accepts the largest card number', () => {
    expect(parseCollectionCursor('common.2147483647')).toEqual({
      kind: 'rarity',
      tier: 'common',
      number: 2_147_483_647,
    })
  })

  it('accepts the bounds of the other kinds', () => {
    expect(parseCollectionCursor('dl.2147483647')).toEqual({
      kind: 'undiscovered',
      number: 2_147_483_647,
    })
    expect(parseCollectionCursor('n.1')).toEqual({ kind: 'number', number: 1 })
    expect(parseCollectionCursor('d.253402300799999.common.1')).toEqual({
      kind: 'discovered',
      discoveredAt: 253_402_300_799_999,
      tier: 'common',
      number: 1,
    })
  })
})
