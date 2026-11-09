import { type CardTier, tierRank } from './cards'

export const COPY_VARIANTS = ['normal', 'foil'] as const

export type CopyVariant = (typeof COPY_VARIANTS)[number]

export const DUST_VALUES: Readonly<Record<CardTier, number>> = {
  common: 5,
  uncommon: 10,
  rare: 25,
  epic: 100,
  legendary: 400,
  mythic: 1000,
}

export const FOIL_DUST_MULTIPLIER = 2
export const CRAFT_COST_MULTIPLIER = 4
export const FOIL_UPGRADE_COST_MULTIPLIER = 2

export type PulledCopyOutcome = 'new' | 'upgraded' | 'duplicate'

export interface StackedCopy {
  tierAtMint: CardTier
  variant: CopyVariant
}

export interface OwnedPullTarget {
  tierAtMint: CardTier
  valueTier: CardTier
}

export interface CopySettlement {
  cardId: string
  variant: CopyVariant
  tierAtMint: CardTier
  outcome: PulledCopyOutcome
  stacked: StackedCopy | null
  stackCountAfter: number | null
  isFirstCopyOfCard: boolean
}

export type CraftBlock = 'owned' | 'not_craftable' | 'provisional' | 'insufficient_dust'

export type FoilUpgradeBlock = 'no_normal' | 'foil_owned' | 'insufficient_dust'

/** Returns the dust a copy is worth, from its tier at mint, doubled for foil. */
export function dustValue(tierAtMint: CardTier, variant: CopyVariant): number {
  const base = DUST_VALUES[tierAtMint]
  return variant === 'foil' ? base * FOIL_DUST_MULTIPLIER : base
}

/** Returns the dust needed to craft a card at its current tier, or null for mythic. */
export function craftCost(currentTier: CardTier): number | null {
  if (currentTier === 'mythic') return null
  return DUST_VALUES[currentTier] * CRAFT_COST_MULTIPLIER
}

/** Returns the dust needed to turn a normal copy into a foil one, from the copy's tier at mint. */
export function foilUpgradeCost(tierAtMint: CardTier): number {
  return DUST_VALUES[tierAtMint] * FOIL_UPGRADE_COST_MULTIPLIER
}

/** Builds the key of one variant of a card in an owned-copies map. */
export function copyKey(cardId: string, variant: CopyVariant): string {
  return `${cardId}:${variant}`
}

/**
 * Decides what happens to a pulled copy against the owned copy of the same variant: it replaces that
 * copy only above its value tier, the displaced copy then stacking at its own tier at mint.
 */
export function resolvePulledCopy(
  owned: OwnedPullTarget | null,
  pulled: StackedCopy,
): { outcome: PulledCopyOutcome; stacked: StackedCopy | null } {
  if (owned === null) return { outcome: 'new', stacked: null }
  if (tierRank(pulled.tierAtMint) > tierRank(owned.valueTier)) {
    return {
      outcome: 'upgraded',
      stacked: { tierAtMint: owned.tierAtMint, variant: pulled.variant },
    }
  }
  return {
    outcome: 'duplicate',
    stacked: { tierAtMint: pulled.tierAtMint, variant: pulled.variant },
  }
}

/**
 * Settles the pulls of one booster in order against the owned copies, keyed by `copyKey`, stacking
 * duplicates and displaced copies; `stackCounts` holds each card's stack size, keyed by card id.
 */
export function settleBoosterCopies(
  pulls: readonly { cardId: string; tier: CardTier; variant: CopyVariant }[],
  owned: ReadonlyMap<string, OwnedPullTarget>,
  stackCounts: ReadonlyMap<string, number>,
): {
  settlements: CopySettlement[]
  owned: ReadonlyMap<string, OwnedPullTarget>
  stackCounts: ReadonlyMap<string, number>
} {
  const initial: {
    settlements: CopySettlement[]
    owned: ReadonlyMap<string, OwnedPullTarget>
    stackCounts: ReadonlyMap<string, number>
  } = { settlements: [], owned, stackCounts }
  return pulls.reduce((acc, pull) => {
    const key = copyKey(pull.cardId, pull.variant)
    const current = acc.owned.get(key) ?? null
    const isFirstCopyOfCard =
      !acc.owned.has(copyKey(pull.cardId, 'normal')) && !acc.owned.has(copyKey(pull.cardId, 'foil'))
    const { outcome, stacked } = resolvePulledCopy(current, {
      tierAtMint: pull.tier,
      variant: pull.variant,
    })
    const nextOwned =
      outcome === 'duplicate'
        ? acc.owned
        : new Map([...acc.owned, [key, { tierAtMint: pull.tier, valueTier: pull.tier }] as const])
    const stackCountAfter = stacked === null ? null : (acc.stackCounts.get(pull.cardId) ?? 0) + 1
    const nextStackCounts =
      stackCountAfter === null
        ? acc.stackCounts
        : new Map([...acc.stackCounts, [pull.cardId, stackCountAfter] as const])
    const settlement: CopySettlement = {
      cardId: pull.cardId,
      variant: pull.variant,
      tierAtMint: pull.tier,
      outcome,
      stacked,
      stackCountAfter,
      isFirstCopyOfCard,
    }
    return {
      settlements: [...acc.settlements, settlement],
      owned: nextOwned,
      stackCounts: nextStackCounts,
    }
  }, initial)
}

/** Decides whether a member may craft a card, checking ownership, craftability, eligibility then dust. */
export function craftDecision(input: {
  currentTier: CardTier
  ownsAnyCopy: boolean
  isBoosterEligible: boolean
  dust: number
}): { cost: number | null; allowed: boolean; reason: CraftBlock | null } {
  const cost = craftCost(input.currentTier)
  const block = (reason: CraftBlock) => ({ cost, allowed: false, reason })
  if (input.ownsAnyCopy) return block('owned')
  if (cost === null) return block('not_craftable')
  if (!input.isBoosterEligible) return block('provisional')
  if (input.dust < cost) return block('insufficient_dust')
  return { cost, allowed: true, reason: null }
}

/** Decides whether a member may upgrade their normal copy to foil, priced on that copy's value tier. */
export function foilUpgradeDecision(input: {
  currentTier: CardTier
  normalValueTier: CardTier | null
  ownsFoil: boolean
  dust: number
}): { cost: number; allowed: boolean; reason: FoilUpgradeBlock | null } {
  const cost = foilUpgradeCost(input.normalValueTier ?? input.currentTier)
  const block = (reason: FoilUpgradeBlock) => ({ cost, allowed: false, reason })
  if (input.normalValueTier === null) return block('no_normal')
  if (input.ownsFoil) return block('foil_owned')
  if (input.dust < cost) return block('insufficient_dust')
  return { cost, allowed: true, reason: null }
}
