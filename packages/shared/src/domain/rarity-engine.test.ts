import { describe, expect, it } from 'vitest'
import { computeLeagueRarity, type RarityCardInput, type RarityResult } from './rarity-engine'
import { COMPUTED_TIERS } from './cards'

const now = new Date('2026-11-07T00:00:00Z')
const ONLY_AGE = { uploaderScarcity: 0, photoAge: 1, reactions: 0 }
const aged = (count: number): RarityCardInput[] =>
  Array.from({ length: count }, (_, i) => ({
    cardId: `c${i}`,
    authorId: 'a',
    capturedAt: new Date(now.getTime() - (i + 1) * 365.25 * 86_400_000),
    isCaptureDateValidated: true,
    reactors: 0,
    reactionSum: 0,
    previousComputedTier: null,
    pinnedTier: null,
    minTier: null,
    maxTier: null,
  }))
const tally = (results: RarityResult[]) =>
  Object.fromEntries(COMPUTED_TIERS.map((t) => [t, results.filter((r) => r.tier === t).length]))

describe('rarity engine', () => {
  it('fills quotas 45/25/15/10/5 from 20 cards', () => {
    expect(tally(computeLeagueRarity({ cards: aged(20), weights: ONLY_AGE, now }))).toEqual({
      common: 9,
      uncommon: 5,
      rare: 3,
      epic: 2,
      legendary: 1,
      mythic: 0,
    })
  })
  it('uses fixed thresholds and no legendary under 15 cards', () => {
    expect(tally(computeLeagueRarity({ cards: aged(10), weights: ONLY_AGE, now }))).toEqual({
      common: 4,
      uncommon: 2,
      rare: 1,
      epic: 3,
      legendary: 0,
      mythic: 0,
    })
  })
  it('allows cold start legendaries from 15 cards', () => {
    expect(
      computeLeagueRarity({ cards: aged(16), weights: ONLY_AGE, now })
        .filter((r) => r.tier === 'legendary')
        .map((r) => r.cardId),
    ).toEqual(['c14', 'c15'])
  })
  it('keeps the previous tier inside the hysteresis band', () => {
    const cards = aged(40)
    expect(computeLeagueRarity({ cards, weights: ONLY_AGE, now })[18]?.computedTier).toBe(
      'uncommon',
    )
    const sticky = cards.map((c, i) =>
      i === 18 ? { ...c, previousComputedTier: 'common' as const } : c,
    )
    expect(computeLeagueRarity({ cards: sticky, weights: ONLY_AGE, now })[18]?.computedTier).toBe(
      'common',
    )
  })
  it('lets pins and bounds override the computation', () => {
    const cards = aged(20).map((c, i) =>
      i === 0
        ? { ...c, pinnedTier: 'mythic' as const }
        : i === 19
          ? { ...c, maxTier: 'uncommon' as const }
          : c,
    )
    const results = computeLeagueRarity({ cards, weights: ONLY_AGE, now })
    expect(results[0]).toMatchObject({
      computedTier: 'common',
      tier: 'mythic',
      tierSource: 'pinned',
    })
    expect(results[19]).toMatchObject({
      computedTier: 'legendary',
      tier: 'uncommon',
      tierSource: 'bounded',
    })
  })
  it('makes the top-scored card the only computed mythic from 50 cards, none under cold start', () => {
    const mythics = (count: number) =>
      computeLeagueRarity({ cards: aged(count), weights: ONLY_AGE, now })
        .filter((r) => r.computedTier === 'mythic')
        .map((r) => r.cardId)
    expect(mythics(60)).toEqual(['c59'])
    expect(mythics(19)).toEqual([])
  })
})
