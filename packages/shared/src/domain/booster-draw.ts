import { CARD_TIERS, type CardTier, isTierAtLeast, tierRank } from './cards'
import {
  CHARM_COLLECTION_ODDS,
  CHARM_WEIGHT_SCALE,
  charmFoilOdds,
  charmSlotWeights,
  type CharmId,
} from './charms'
import type { CopyVariant } from './dust'
import { isEpicGuaranteed, legendaryBonusPercent, type PityState } from './pity'
import type { RandomSource } from './random'

export const DROP_TABLE_VERSION = 4

const EPIC_FLOOR_SINCE_VERSION = 2
const NO_DUPLICATE_SINCE_VERSION = 3
export const PREMIUM_SINCE_VERSION = 4
export const FOIL_ODDS = 15

export type TierWeights = Readonly<Partial<Record<CardTier, number>>>

const CU: TierWeights = { common: 80, uncommon: 20 }
const UPLUS: TierWeights = { uncommon: 70, rare: 30 }
const RPLUS: TierWeights = { rare: 72, epic: 20, legendary: 7, mythic: 1 }

const RARE_PLUS_PREMIUM: TierWeights = { rare: 75, epic: 25 }
const LEGENDARY_PLUS: TierWeights = { legendary: 85, mythic: 15 }

export const BOOSTER_SLOTS: readonly TierWeights[] = [CU, CU, CU, UPLUS, RPLUS]

export const PREMIUM_BOOSTER_SLOTS: readonly TierWeights[] = [
  CU,
  CU,
  CU,
  RARE_PLUS_PREMIUM,
  LEGENDARY_PLUS,
]

export const PREMIUM_SLOT_FLOORS: readonly (CardTier | undefined)[] = [
  undefined,
  undefined,
  undefined,
  'rare',
  'legendary',
]

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
  isRedirected: boolean
  isLuckBoosted: boolean
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

/** Returns each tier's chance in percent, rounded to one decimal, for tiers with a positive weight. */
export function slotOddsPercent(weights: TierWeights): Partial<Record<CardTier, number>> {
  const entries = CARD_TIERS.map((tier) => [tier, weights[tier] ?? 0] as const).filter(
    ([, weight]) => weight > 0,
  )
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  return Object.fromEntries(
    entries.map(([tier, weight]) => [tier, Math.round((weight / total) * 1000) / 10]),
  )
}

/** Returns the tier a roll in [0, total) lands on, cumulative over tiers ascending. */
export function tierAtRoll(weights: TierWeights, roll: number): CardTier {
  let cumulative = 0
  for (const tier of CARD_TIERS) {
    cumulative += weights[tier] ?? 0
    if (roll < cumulative) return tier
  }
  throw new Error('Tier roll out of range')
}

function weightTotal(weights: TierWeights): number {
  return CARD_TIERS.reduce((sum, tier) => sum + Math.max(0, weights[tier] ?? 0), 0)
}

/** Rolls a tier from integer weights with a single draw, cumulative over tiers ascending. */
export function rollTier(weights: TierWeights, random: RandomSource): CardTier {
  return rollTierWithValue(weights, random).tier
}

function rollTierWithValue(
  weights: TierWeights,
  random: RandomSource,
): { tier: CardTier; roll: number } {
  const roll = random.nextInt(weightTotal(weights))
  return { tier: tierAtRoll(weights, roll), roll }
}

function scaleWeights(weights: TierWeights, factor: number): TierWeights {
  return Object.fromEntries(
    CARD_TIERS.map((tier) => [tier, (weights[tier] ?? 0) * factor] as const),
  )
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

function collectionCandidates(
  tierCards: readonly PoolCard[],
  charm: CharmId | null,
  ownedCardIds: ReadonlySet<string>,
): readonly PoolCard[] | null {
  if (charm !== 'boussole' && charm !== 'aimant') return null
  const wantsOwned = charm === 'aimant'
  const narrowed = tierCards.filter((c) => ownedCardIds.has(c.cardId) === wantsOwned)
  return narrowed.length > 0 && narrowed.length < tierCards.length ? narrowed : null
}

/**
 * Draws the five slots of a booster; RNG order per slot is tier, author, card, foil.
 * A luck charm (Trèfle, Trèfle d'or) flags the pull when the same roll on the usual weights would have
 * landed below the Légendaire or Mythique it gave.
 * A collection charm (Boussole, Aimant) adds one roll after the tier: 1 in 4 narrows the pick to the
 * unowned or owned cards of that tier. Without a charm the draw consumes the same numbers as before.
 * From version 3 the draw is without replacement and needs at least five distinct cards.
 * `tableVersion` defaults to the current table; version 1 replays the fallback without the Epic floor.
 * From version 4 `isPremium` switches to the premium table and slot floors, ignoring pity.
 */
export function drawBooster(input: {
  pool: readonly PoolCard[]
  pity: PityState
  random: RandomSource
  tableVersion?: number
  isPremium?: boolean
  charm?: CharmId | null
  ownedCardIds?: ReadonlySet<string>
}): BoosterDraw[] {
  if (input.pool.length === 0) throw new EmptyBoosterPoolError()
  const tableVersion = input.tableVersion ?? DROP_TABLE_VERSION
  const isUnique = tableVersion >= NO_DUPLICATE_SINCE_VERSION
  const distinctCount = new Set(input.pool.map((c) => c.cardId)).size
  if (isUnique && !canOpenBooster(distinctCount)) throw new BoosterPoolTooSmallError(distinctCount)
  const hasEpicFloor = tableVersion >= EPIC_FLOOR_SINCE_VERSION && isEpicGuaranteed(input.pity)
  const isPremium = tableVersion >= PREMIUM_SINCE_VERSION && input.isPremium === true
  const slotTable = isPremium ? PREMIUM_BOOSTER_SLOTS : BOOSTER_SLOTS
  const charm = input.charm ?? null
  const ownedCardIds = input.ownedCardIds ?? new Set<string>()
  const foilOdds = charmFoilOdds(charm, FOIL_ODDS)
  return slotTable.reduce<BoosterDraw[]>((draws, slotWeights, slot) => {
    const drawn = new Set(isUnique ? draws.map((d) => d.cardId) : [])
    const remaining = input.pool.filter((c) => !drawn.has(c.cardId))
    const available = new Set(remaining.map((c) => c.tier))
    const isRarePlus = slot === RARE_PLUS_SLOT
    const baseWeights = !isPremium && isRarePlus ? rarePlusWeights(input.pity) : slotWeights
    const charmed =
      charm !== null && isRarePlus
        ? charmSlotWeights(baseWeights, charm, isPremium ? 'premium' : 'standard')
        : null
    const { tier: rolledTier, roll } = rollTierWithValue(charmed ?? baseWeights, input.random)
    const floor: CardTier | undefined = isPremium
      ? PREMIUM_SLOT_FLOORS[slot]
      : isRarePlus && hasEpicFloor
        ? 'epic'
        : undefined
    const tier = resolveTierWithFallback(rolledTier, available, floor)
    if (tier === null) throw new EmptyBoosterPoolError()
    const baseTier =
      charmed === null
        ? tier
        : resolveTierWithFallback(
            tierAtRoll(scaleWeights(baseWeights, CHARM_WEIGHT_SCALE), roll),
            available,
            floor,
          )
    const tierCards = remaining.filter((c) => c.tier === tier)
    const narrowed = collectionCandidates(tierCards, charm, ownedCardIds)
    const isCollectionCharm = charm === 'boussole' || charm === 'aimant'
    const isRedirected =
      isCollectionCharm && input.random.nextInt(CHARM_COLLECTION_ODDS) === 0 && narrowed !== null
    const picked = pickFromTier(
      isRedirected && narrowed !== null ? narrowed : tierCards,
      input.random,
    )
    const variant: CopyVariant = input.random.nextInt(foilOdds) === 0 ? 'foil' : 'normal'
    return [
      ...draws,
      {
        slot,
        rolledTier,
        tier,
        cardId: picked.cardId,
        variant,
        isRedirected,
        isLuckBoosted:
          baseTier !== null &&
          tierRank(tier) > tierRank(baseTier) &&
          isTierAtLeast(tier, 'legendary'),
      },
    ]
  }, [])
}

/** Builds the canonical string the API hashes to fingerprint a booster pool. */
export function boosterPoolDigestInput(pool: readonly PoolCard[]): string {
  return pool
    .toSorted(byNumberThenId)
    .map((c) => `${c.number}:${c.tier}:${c.authorId ?? ''}`)
    .join(',')
}
