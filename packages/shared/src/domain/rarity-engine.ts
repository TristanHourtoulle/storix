import type { CardTier } from './cards'
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
  positionPercentiles,
  QUOTA_LOWER_BOUNDS,
  resolveEffectiveTier,
  type ComputedTier,
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
  minTier: ComputedTier | null
  maxTier: ComputedTier | null
}

export interface RarityResult {
  cardId: string
  score: number
  percentile: number
  computedTier: ComputedTier
  tier: CardTier
  tierSource: TierSource
}

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
  return cards.map((card, i) => {
    const score = scores[i] ?? 0
    const percentile = percentiles[i] ?? 0
    const computedTier = isColdStart
      ? capColdStartTier(
          applyHysteresis({
            value: score,
            previous: card.previousComputedTier,
            bounds: COLD_START_LOWER_BOUNDS,
          }),
          n,
        )
      : applyHysteresis({
          value: percentile,
          previous: card.previousComputedTier,
          bounds: QUOTA_LOWER_BOUNDS,
        })
    const { tier, source } = resolveEffectiveTier({
      computed: computedTier,
      pinned: card.pinnedTier,
      min: card.minTier,
      max: card.maxTier,
    })
    return { cardId: card.cardId, score, percentile, computedTier, tier, tierSource: source }
  })
}
