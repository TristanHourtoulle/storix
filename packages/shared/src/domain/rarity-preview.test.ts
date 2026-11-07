import { describe, expect, it } from 'vitest'
import type { CardTier } from './cards'
import type { RarityCardInput } from './rarity-engine'
import { DEFAULT_RARITY_WEIGHTS } from './rarity-signals'
import { previewRarity, tierDistribution } from './rarity-preview'

const now = new Date('2026-11-07T00:00:00Z')

const input = (i: number, tier: CardTier): RarityCardInput & { tier: CardTier } => ({
  cardId: `c${i}`,
  authorId: i % 2 === 0 ? 'a' : 'b',
  capturedAt: new Date(now.getTime() - (i + 1) * 31_557_600_000),
  isCaptureDateValidated: true,
  reactors: 0,
  reactionSum: 0,
  previousComputedTier: null,
  pinnedTier: null,
  minTier: null,
  maxTier: null,
  tier,
})

describe('tierDistribution', () => {
  it('counts every tier, zeros included', () => {
    expect(tierDistribution(['rare', 'rare', 'mythic'])).toEqual({
      common: 0,
      uncommon: 0,
      rare: 2,
      epic: 0,
      legendary: 0,
      mythic: 1,
    })
  })
})

describe('previewRarity', () => {
  it('previews 20 cards on photo age only as 9/5/3/2/1', () => {
    const cards = Array.from({ length: 20 }, (_, i) => input(i, 'common'))
    const result = previewRarity({
      cards,
      weights: { uploaderScarcity: 0, photoAge: 1, reactions: 0 },
      now,
    })
    expect(result.preview).toEqual({
      common: 9,
      uncommon: 5,
      rare: 3,
      epic: 2,
      legendary: 1,
      mythic: 0,
    })
    expect(result.current.common).toBe(20)
    expect(result.changed).toBe(11)
  })

  it('keeps pins in the preview', () => {
    const cards = [{ ...input(0, 'mythic'), pinnedTier: 'mythic' as const }]
    expect(previewRarity({ cards, weights: DEFAULT_RARITY_WEIGHTS, now }).preview.mythic).toBe(1)
  })

  it('returns an empty distribution for no cards', () => {
    const result = previewRarity({ cards: [], weights: DEFAULT_RARITY_WEIGHTS, now })
    expect(result.changed).toBe(0)
    expect(result.preview.common).toBe(0)
  })
})
