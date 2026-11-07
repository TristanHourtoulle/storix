import { CARD_TIERS, type CardTier, tierRank } from './cards'
import type { CopyVariant } from './dust'
import { isEpicGuaranteed, legendaryBonusPercent, type PityState } from './pity'
import type { RandomSource } from './random'

export const DROP_TABLE_VERSION = 3

const EPIC_FLOOR_SINCE_VERSION = 2
const NO_DUPLICATE_SINCE_VERSION = 3
export const FOIL_ODDS = 15

export type TierWeights = Readonly<Partial<Record<CardTier, number>>>

const CU: TierWeights = { common: 80, uncommon: 20 }
const UPLUS: TierWeights = { uncommon: 70, rare: 30 }
const RPLUS: TierWeights = { rare: 72, epic: 20, legendary: 7, mythic: 1 }

export const BOOSTER_SLOTS: readonly TierWeights[] = [CU, CU, CU, UPLUS, RPLUS]

const RARE_PLUS_SLOT = BOOSTER_SLOTS.length - 1

/** Minimum number of distinct drawable cards a league needs before a booster can be opened. */
export const MIN_DRAWABLE_CARDS_FOR_BOOSTER = BOOSTER_SLOTS.length

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

export class BoosterPoolTooSmallError extends Error {
  constructor(readonly drawableCount: number) {
    super('The booster pool has fewer distinct cards than booster slots')
    this.name = 'BoosterPoolTooSmallError'
  }
}

/** Whether a pool of `drawableCount` distinct cards can fill a booster without duplicates. */
export function canOpenBooster(drawableCount: number): boolean {
  return drawableCount >= MIN_DRAWABLE_CARDS_FOR_BOOSTER
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

/**
 * Returns the rolled tier if present, else the nearest lower present tier, else the nearest higher one.
 * With a floor at or below the rolled tier, tiers from the rolled one down to the floor come first,
 * then the higher tiers, and tiers below the floor only last.
 */
export function resolveTierWithFallback(
  rolled: CardTier,
  available: ReadonlySet<CardTier>,
  floor?: CardTier,
): CardTier | null {
  const rank = tierRank(rolled)
  const lower = CARD_TIERS.slice(0, rank + 1).toReversed()
  const higher = CARD_TIERS.slice(rank + 1)
  const floorRank = floor === undefined ? 0 : Math.min(tierRank(floor), rank)
  const aboveFloor = lower.filter((tier) => tierRank(tier) >= floorRank)
  const belowFloor = lower.filter((tier) => tierRank(tier) < floorRank)
  return [...aboveFloor, ...higher, ...belowFloor].find((tier) => available.has(tier)) ?? null
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

/**
 * Draws the five slots of a booster; RNG order per slot is tier, author, card, foil.
 * From version 3 the draw is without replacement and needs at least five distinct cards.
 * `tableVersion` defaults to the current table; version 1 replays the fallback without the Epic floor.
 */
export function drawBooster(input: {
  pool: readonly PoolCard[]
  pity: PityState
  random: RandomSource
  tableVersion?: number
}): BoosterDraw[] {
  if (input.pool.length === 0) throw new EmptyBoosterPoolError()
  const tableVersion = input.tableVersion ?? DROP_TABLE_VERSION
  const isUnique = tableVersion >= NO_DUPLICATE_SINCE_VERSION
  const distinctCount = new Set(input.pool.map((c) => c.cardId)).size
  if (isUnique && !canOpenBooster(distinctCount)) throw new BoosterPoolTooSmallError(distinctCount)
  const hasEpicFloor = tableVersion >= EPIC_FLOOR_SINCE_VERSION && isEpicGuaranteed(input.pity)
  return BOOSTER_SLOTS.reduce<BoosterDraw[]>((draws, slotWeights, slot) => {
    const drawn = new Set(isUnique ? draws.map((d) => d.cardId) : [])
    const remaining = input.pool.filter((c) => !drawn.has(c.cardId))
    const available = new Set(remaining.map((c) => c.tier))
    const isRarePlus = slot === RARE_PLUS_SLOT
    const weights = isRarePlus ? rarePlusWeights(input.pity) : slotWeights
    const rolledTier = rollTier(weights, input.random)
    const floor: CardTier | undefined = isRarePlus && hasEpicFloor ? 'epic' : undefined
    const tier = resolveTierWithFallback(rolledTier, available, floor)
    if (tier === null) throw new EmptyBoosterPoolError()
    const picked = pickFromTier(
      remaining.filter((c) => c.tier === tier),
      input.random,
    )
    const variant: CopyVariant = input.random.nextInt(FOIL_ODDS) === 0 ? 'foil' : 'normal'
    return [...draws, { slot, rolledTier, tier, cardId: picked.cardId, variant }]
  }, [])
}

/** Builds the canonical string the API hashes to fingerprint a booster pool. */
export function boosterPoolDigestInput(pool: readonly PoolCard[]): string {
  return pool
    .toSorted(byNumberThenId)
    .map((c) => `${c.number}:${c.tier}:${c.authorId ?? ''}`)
    .join(',')
}
