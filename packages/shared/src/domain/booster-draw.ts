import { CARD_TIERS, type CardTier, tierRank } from './cards'
import type { CopyVariant } from './dust'
import { isEpicGuaranteed, legendaryBonusPercent, type PityState } from './pity'
import type { RandomSource } from './random'

export const DROP_TABLE_VERSION = 1
export const FOIL_ODDS = 15

export type TierWeights = Readonly<Partial<Record<CardTier, number>>>

const CU: TierWeights = { common: 80, uncommon: 20 }
const UPLUS: TierWeights = { uncommon: 70, rare: 30 }
const RPLUS: TierWeights = { rare: 72, epic: 20, legendary: 7, mythic: 1 }

export const BOOSTER_SLOTS: readonly TierWeights[] = [CU, CU, CU, UPLUS, RPLUS]

const RARE_PLUS_SLOT = BOOSTER_SLOTS.length - 1

export interface PoolCard {
  cardId: string
  authorId: string | null
  number: number
  tier: CardTier
}

export interface BoosterDraw {
  slot: number
  rolledTier: CardTier
  tier: CardTier
  cardId: string
  variant: CopyVariant
}

const byNumberThenId = (x: PoolCard, y: PoolCard): number =>
  x.number - y.number || (x.cardId < y.cardId ? -1 : x.cardId > y.cardId ? 1 : 0)

export class EmptyBoosterPoolError extends Error {
  constructor() {
    super('The booster pool is empty')
    this.name = 'EmptyBoosterPoolError'
  }
}

/** Returns the rare+ slot weights with the Legendary pity bonus and the Epic guarantee applied. */
export function rarePlusWeights(p: PityState): TierWeights {
  const rare = RPLUS.rare ?? 0
  const epic = RPLUS.epic ?? 0
  const bonus = legendaryBonusPercent(p)
  const fromRare = Math.min(rare, bonus)
  const fromEpic = Math.min(epic, bonus - fromRare)
  return {
    ...RPLUS,
    rare: isEpicGuaranteed(p) ? 0 : rare - fromRare,
    epic: epic - fromEpic,
    legendary: (RPLUS.legendary ?? 0) + fromRare + fromEpic,
  }
}

/** Rolls a tier from integer weights with a single draw, cumulative over tiers ascending. */
export function rollTier(weights: TierWeights, random: RandomSource): CardTier {
  const entries = CARD_TIERS.map((tier) => [tier, weights[tier] ?? 0] as const).filter(
    ([, weight]) => weight > 0,
  )
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  const roll = random.nextInt(total)
  let cumulative = 0
  for (const [tier, weight] of entries) {
    cumulative += weight
    if (roll < cumulative) return tier
  }
  throw new Error('Tier roll out of range')
}

/** Returns the rolled tier if present, else the nearest lower present tier, else the nearest higher one. */
export function resolveTierWithFallback(
  rolled: CardTier,
  available: ReadonlySet<CardTier>,
): CardTier | null {
  const rank = tierRank(rolled)
  const lower = CARD_TIERS.slice(0, rank + 1).toReversed()
  const higher = CARD_TIERS.slice(rank + 1)
  return [...lower, ...higher].find((tier) => available.has(tier)) ?? null
}

/** Picks an author uniformly, then one of that author's cards uniformly. */
export function pickFromTier(cards: readonly PoolCard[], random: RandomSource): PoolCard {
  const authorKey = (c: PoolCard) => c.authorId ?? ''
  const authors = [...new Set(cards.map(authorKey))].toSorted((x, y) =>
    x < y ? -1 : x > y ? 1 : 0,
  )
  const author = authors[random.nextInt(authors.length)]
  const candidates = cards.filter((c) => authorKey(c) === author).toSorted(byNumberThenId)
  const picked = candidates[random.nextInt(candidates.length)]
  if (picked === undefined) throw new EmptyBoosterPoolError()
  return picked
}

/** Draws the five slots of a booster; RNG order per slot is tier, author, card, foil. */
export function drawBooster(input: {
  pool: readonly PoolCard[]
  pity: PityState
  random: RandomSource
}): BoosterDraw[] {
  if (input.pool.length === 0) throw new EmptyBoosterPoolError()
  const available = new Set(input.pool.map((c) => c.tier))
  return BOOSTER_SLOTS.map((slotWeights, slot) => {
    const weights = slot === RARE_PLUS_SLOT ? rarePlusWeights(input.pity) : slotWeights
    const rolledTier = rollTier(weights, input.random)
    const tier = resolveTierWithFallback(rolledTier, available)
    if (tier === null) throw new EmptyBoosterPoolError()
    const picked = pickFromTier(
      input.pool.filter((c) => c.tier === tier),
      input.random,
    )
    const variant: CopyVariant = input.random.nextInt(FOIL_ODDS) === 0 ? 'foil' : 'normal'
    return { slot, rolledTier, tier, cardId: picked.cardId, variant }
  })
}

/** Builds the canonical string the API hashes to fingerprint a booster pool. */
export function boosterPoolDigestInput(pool: readonly PoolCard[]): string {
  return pool
    .toSorted(byNumberThenId)
    .map((c) => `${c.number}:${c.tier}:${c.authorId ?? ''}`)
    .join(',')
}
