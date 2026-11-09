import { describe, expect, it } from 'vitest'
import { LEGACY_COLLECTION_CURSOR } from '../domain'
import { listCardsQuerySchema } from './cards'

describe('list cards query cursor', () => {
  it('parses a tier.number cursor', () => {
    expect(listCardsQuerySchema.parse({ cursor: 'epic.42' }).cursor).toEqual({
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
})
