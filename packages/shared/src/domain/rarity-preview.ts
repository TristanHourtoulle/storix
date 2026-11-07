import type { CardTier } from './cards'
import { computeLeagueRarity, type RarityCardInput } from './rarity-engine'
import type { RarityWeights } from './rarity-signals'

export type TierDistribution = Readonly<Record<CardTier, number>>

/** Counts cards per tier, always returning all six tiers. */
export function tierDistribution(tiers: readonly CardTier[]): TierDistribution {
  const counts: Record<CardTier, number> = {
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
    mythic: 0,
  }
  for (const tier of tiers) counts[tier] += 1
  return counts
}

/** Compares the current tier distribution with the one the given weights would produce. */
export function previewRarity(input: {
  cards: readonly (RarityCardInput & { tier: CardTier })[]
  weights: RarityWeights
  now: Date
}): { current: TierDistribution; preview: TierDistribution; changed: number } {
  const results = computeLeagueRarity(input)
  const changed = results.reduce(
    (count, result, i) => (result.tier !== input.cards[i]?.tier ? count + 1 : count),
    0,
  )
  return {
    current: tierDistribution(input.cards.map((card) => card.tier)),
    preview: tierDistribution(results.map((result) => result.tier)),
    changed,
  }
}
