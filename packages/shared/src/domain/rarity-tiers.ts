import {
  BOUND_TIERS,
  type BoundTier,
  type CardTier,
  type ComputedTier,
  maxTier,
  minTier,
  tierRank,
} from './cards'

export type TierBounds = Readonly<Record<BoundTier, number>>

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

export const MYTHIC_MIN_CARDS = 50

export const MYTHIC_CARDS_PER_QUOTA = 100

export const MYTHIC_RETAIN_PERCENTILE = 0.95

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
export function tierForValue(value: number, bounds: TierBounds): BoundTier {
  return BOUND_TIERS.reduce<BoundTier>(
    (found, tier) => (bounds[tier] <= value ? tier : found),
    'common',
  )
}

const BASIS_POINTS = 10_000

const toBasisPoints = (value: number): number => Math.round(value * BASIS_POINTS)

function tierForBasisPoints(
  basisPoints: number,
  bounds: TierBounds,
  isStrict = false,
): BoundTier {
  return BOUND_TIERS.reduce<BoundTier>((found, tier) => {
    const bound = toBasisPoints(bounds[tier])
    return (isStrict ? bound < basisPoints : bound <= basisPoints) ? tier : found
  }, 'common')
}

/** Moves away from the previous tier only once the value is at least the hysteresis margin past a boundary. */
export function applyHysteresis(input: {
  value: number
  previous: BoundTier | null
  bounds: TierBounds
}): BoundTier {
  const basisPoints = toBasisPoints(input.value)
  const margin = toBasisPoints(HYSTERESIS_MARGIN)
  const candidate = tierForBasisPoints(basisPoints, input.bounds)
  const { previous } = input
  if (previous === null) return candidate
  if (tierRank(candidate) > tierRank(previous)) {
    return maxTier(previous, tierForBasisPoints(basisPoints - margin, input.bounds))
  }
  if (tierRank(candidate) < tierRank(previous)) {
    return minTier(previous, tierForBasisPoints(basisPoints + margin, input.bounds, true))
  }
  return previous
}

/** Downgrades a cold start legendary to epic while the league has fewer than 15 active cards. */
export function capColdStartTier(tier: BoundTier, activeCardCount: number): BoundTier {
  return tier === 'legendary' && activeCardCount < COLD_START_MIN_CARDS_FOR_LEGENDARY
    ? 'epic'
    : tier
}

/** Applies admin precedence: a pin wins, then the min bound, then the max bound. */
export function resolveEffectiveTier(input: {
  computed: ComputedTier
  pinned: CardTier | null
  min: BoundTier | null
  max: BoundTier | null
}): { tier: CardTier; source: TierSource } {
  if (input.pinned !== null) return { tier: input.pinned, source: 'pinned' }
  const raised = input.min === null ? input.computed : maxTier(input.computed, input.min)
  const clamped = input.max === null ? raised : minTier(raised, input.max)
  return { tier: clamped, source: clamped === input.computed ? 'computed' : 'bounded' }
}

/** Returns how many cards the league may hold as computed Mythics: none under 50 active cards, then one per 100. */
export function mythicQuota(activeCardCount: number): number {
  return activeCardCount < MYTHIC_MIN_CARDS
    ? 0
    : Math.max(1, Math.floor(activeCardCount / MYTHIC_CARDS_PER_QUOTA))
}

export interface MythicCandidate {
  cardId: string
  number: number
  score: number
  percentile: number
  isEligible: boolean
  wasMythic: boolean
}

const byScoreThenNumberThenId = (a: MythicCandidate, b: MythicCandidate): number =>
  b.score - a.score || a.number - b.number || a.cardId.localeCompare(b.cardId)

/** Keeps eligible previous Mythics still in the Legendary band, then fills the quota with the best eligible cards. */
export function selectComputedMythics(
  candidates: readonly MythicCandidate[],
  quota: number,
): ReadonlySet<string> {
  if (quota <= 0) return new Set()
  const eligible = candidates.filter((card) => card.isEligible).toSorted(byScoreThenNumberThenId)
  const retained = eligible
    .filter((card) => card.wasMythic && card.percentile >= MYTHIC_RETAIN_PERCENTILE)
    .slice(0, quota)
  const retainedIds = new Set(retained.map((card) => card.cardId))
  const newcomers = eligible
    .filter((card) => !retainedIds.has(card.cardId))
    .slice(0, quota - retained.length)
  return new Set([...retained, ...newcomers].map((card) => card.cardId))
}
