import { describe, expect, it } from 'vitest'
import { LEGACY_COLLECTION_CURSOR } from '../domain'
import { listCardsQuerySchema } from './cards'

describe('list cards query cursor', () => {
  it('parses a tier.number cursor', () => {
    expect(listCardsQuerySchema.parse({ cursor: 'epic.42' }).cursor).toEqual({
      kind: 'rarity',
      tier: 'epic',
      number: 42,
    })
  })

  it('maps a legacy numeric cursor to the legacy marker', () => {
    expect(listCardsQuerySchema.parse({ cursor: '42' }).cursor).toBe(LEGACY_COLLECTION_CURSOR)
  })

  it('leaves the cursor out when absent', () => {
    expect(listCardsQuerySchema.parse({}).cursor).toBeUndefined()
  })

  it.each(['', 'legacy', '0', '-1', 'shiny.4', 'epic.0', '42.epic'])('rejects %j', (cursor) => {
    expect(listCardsQuerySchema.safeParse({ cursor }).success).toBe(false)
  })

  it('defaults sort to rarity', () => {
    expect(listCardsQuerySchema.parse({}).sort).toBe('rarity')
  })

  it('accepts sort=discovery with d. and dl. cursors', () => {
    expect(
      listCardsQuerySchema.parse({ sort: 'discovery', cursor: 'd.1794200000123.epic.12' }).cursor,
    ).toEqual({ kind: 'discovered', discoveredAt: 1794200000123, tier: 'epic', number: 12 })
    expect(listCardsQuerySchema.parse({ sort: 'discovery', cursor: 'dl.66' }).cursor).toEqual({
      kind: 'undiscovered',
      number: 66,
    })
  })

  it('accepts sort=number with n.4', () => {
    expect(listCardsQuerySchema.parse({ sort: 'number', cursor: 'n.4' }).cursor).toEqual({
      kind: 'number',
      number: 4,
    })
  })

  it.each([
    ['rarity', 'n.4'],
    ['rarity', 'dl.4'],
    ['discovery', 'epic.4'],
    ['number', 'd.1.epic.4'],
  ])('rejects a cursor of another sort (%s, %j)', (sort, cursor) => {
    const result = listCardsQuerySchema.safeParse({ sort, cursor })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['cursor'])
  })

  it('rejects a cursor of another sort when sort is absent', () => {
    expect(listCardsQuerySchema.safeParse({ cursor: 'n.4' }).success).toBe(false)
  })

  it('keeps the legacy marker with sort=discovery', () => {
    expect(listCardsQuerySchema.parse({ sort: 'discovery', cursor: '42' }).cursor).toBe(
      LEGACY_COLLECTION_CURSOR,
    )
  })

  it('rejects an unknown sort', () => {
    expect(listCardsQuerySchema.safeParse({ sort: 'date' }).success).toBe(false)
  })
})
