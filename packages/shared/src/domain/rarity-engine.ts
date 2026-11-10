import type { BoundTier, CardTier, ComputedTier } from './cards'
import {
  photoAgeSignals,
  rarityScore,
  reactionSignals,
  scarcitySignals,
  type RarityWeights,
} from './rarity-signals'
import {
  applyHysteresis,
  capColdStartTier,
  COLD_START_CARD_COUNT,
  COLD_START_LOWER_BOUNDS,
  mythicQuota,
  positionPercentiles,
  QUOTA_LOWER_BOUNDS,
  resolveEffectiveTier,
  selectComputedMythics,
  type TierSource,
} from './rarity-tiers'

export interface RarityCardInput {
  cardId: string
  authorId: string | null
  capturedAt: Date | null
  isCaptureDateValidated: boolean
  reactors: number
  reactionSum: number
  previousComputedTier: ComputedTier | null
  pinnedTier: CardTier | null
  minTier: BoundTier | null
  maxTier: BoundTier | null
}

export interface RarityResult {
  cardId: string
  score: number
  percentile: number
  computedTier: ComputedTier
  tier: CardTier
  tierSource: TierSource
}

const toBandTier = (tier: ComputedTier | null): BoundTier | null =>
  tier === 'mythic' ? 'legendary' : tier

/** Computes every active card's rarity in a league, preserving input order. */
export function computeLeagueRarity(input: {
  cards: readonly RarityCardInput[]
  weights: RarityWeights
  now: Date
}): RarityResult[] {
  const { cards, weights, now } = input
  const n = cards.length
  const scarcity = scarcitySignals(cards.map((card) => card.authorId))
  const photoAge = photoAgeSignals(
    cards.map((card) => ({
      capturedAt: card.capturedAt,
      isValidated: card.isCaptureDateValidated,
    })),
    now,
  )
  const reactions = reactionSignals(cards)
  const scores = cards.map((_, i) =>
    rarityScore(
      {
        uploaderScarcity: scarcity[i] ?? 0,
        photoAge: photoAge[i] ?? 0,
        reactions: reactions[i] ?? 0,
      },
      weights,
    ),
  )
  const percentiles = positionPercentiles(scores)
  const isColdStart = n < COLD_START_CARD_COUNT
  const mythicIds = selectComputedMythics(
    cards.map((card, i) => ({
      cardId: card.cardId,
      number: i,
      score: scores[i] ?? 0,
      percentile: percentiles[i] ?? 0,
      isEligible: card.pinnedTier === null && card.maxTier === null,
      wasMythic: card.previousComputedTier === 'mythic',
    })),
    isColdStart ? 0 : mythicQuota(n),
  )
  return cards.map((card, i) => {
    const score = scores[i] ?? 0
    const percentile = percentiles[i] ?? 0
    const previous = toBandTier(card.previousComputedTier)
    const bandTier = isColdStart
      ? capColdStartTier(
          applyHysteresis({ value: score, previous, bounds: COLD_START_LOWER_BOUNDS }),
          n,
        )
      : applyHysteresis({ value: percentile, previous, bounds: QUOTA_LOWER_BOUNDS })
    const computedTier: ComputedTier = mythicIds.has(card.cardId) ? 'mythic' : bandTier
    const { tier, source } = resolveEffectiveTier({
      computed: computedTier,
      pinned: card.pinnedTier,
      min: card.minTier,
      max: card.maxTier,
    })
    return { cardId: card.cardId, score, percentile, computedTier, tier, tierSource: source }
  })
}
