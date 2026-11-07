import {
  COMPUTED_TIERS,
  type CardTier,
  type ComputedTier,
  maxTier,
  minTier,
  tierRank,
} from './cards'

export type TierBounds = Readonly<Record<ComputedTier, number>>

export type TierSource = 'computed' | 'bounded' | 'pinned'

export const QUOTA_LOWER_BOUNDS: TierBounds = {
  common: 0,
  uncommon: 0.45,
  rare: 0.7,
  epic: 0.85,
  legendary: 0.95,
}

export const COLD_START_CARD_COUNT = 20

export const COLD_START_MIN_CARDS_FOR_LEGENDARY = 15

export const COLD_START_LOWER_BOUNDS: TierBounds = {
  common: 0,
  uncommon: 0.4,
  rare: 0.6,
  epic: 0.75,
  legendary: 0.88,
}

export const HYSTERESIS_MARGIN = 0.02

/** Returns `(zero-based mid-rank + 0.5) / n` for each score. */
export function positionPercentiles(scores: readonly number[]): number[] {
  const n = scores.length
  return scores.map((score) => {
    const below = scores.filter((other) => other < score).length
    const equal = scores.filter((other) => other === score).length
    return (below + (equal - 1) / 2 + 0.5) / n
  })
}

/** Returns the highest tier whose lower bound is at most `value`. */
export function tierForValue(value: number, bounds: TierBounds): ComputedTier {
  return COMPUTED_TIERS.reduce<ComputedTier>(
    (found, tier) => (bounds[tier] <= value ? tier : found),
    'common',
  )
}

/** Moves away from the previous tier only once the value clears a boundary by the hysteresis margin. */
export function applyHysteresis(input: {
  value: number
  previous: ComputedTier | null
  bounds: TierBounds
}): ComputedTier {
  const candidate = tierForValue(input.value, input.bounds)
  const { previous } = input
  if (previous === null) return candidate
  if (tierRank(candidate) > tierRank(previous)) {
    return maxTier(previous, tierForValue(input.value - HYSTERESIS_MARGIN, input.bounds))
  }
  if (tierRank(candidate) < tierRank(previous)) {
    return minTier(previous, tierForValue(input.value + HYSTERESIS_MARGIN, input.bounds))
  }
  return previous
}

/** Downgrades a cold start legendary to epic while the league has fewer than 15 active cards. */
export function capColdStartTier(tier: ComputedTier, activeCardCount: number): ComputedTier {
  return tier === 'legendary' && activeCardCount < COLD_START_MIN_CARDS_FOR_LEGENDARY
    ? 'epic'
    : tier
}

/** Applies admin precedence: a pin wins, then the min bound, then the max bound. */
export function resolveEffectiveTier(input: {
  computed: ComputedTier
  pinned: CardTier | null
  min: ComputedTier | null
  max: ComputedTier | null
}): { tier: CardTier; source: TierSource } {
  if (input.pinned !== null) return { tier: input.pinned, source: 'pinned' }
  const raised = input.min === null ? input.computed : maxTier(input.computed, input.min)
  const clamped = input.max === null ? raised : minTier(raised, input.max)
  return { tier: clamped, source: clamped === input.computed ? 'computed' : 'bounded' }
}
