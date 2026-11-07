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

export interface CopySettlement {
  cardId: string
  variant: CopyVariant
  tierAtMint: CardTier
  outcome: PulledCopyOutcome
  dust: number
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

/** Decides what happens to a pulled copy given the tier of the owned copy of the same variant. */
export function resolvePulledCopy(
  owned: CardTier | null,
  pulled: { tierAtMint: CardTier; variant: CopyVariant },
): { outcome: PulledCopyOutcome; dust: number } {
  if (owned === null) return { outcome: 'new', dust: 0 }
  if (tierRank(pulled.tierAtMint) > tierRank(owned)) {
    return { outcome: 'upgraded', dust: dustValue(owned, pulled.variant) }
  }
  return { outcome: 'duplicate', dust: dustValue(pulled.tierAtMint, pulled.variant) }
}

/** Settles the pulls of one booster in order against the owned copies, keyed by `copyKey`. */
export function settleBoosterCopies(
  pulls: readonly { cardId: string; tier: CardTier; variant: CopyVariant }[],
  owned: ReadonlyMap<string, CardTier>,
): { settlements: CopySettlement[]; dustGained: number; owned: ReadonlyMap<string, CardTier> } {
  const initial: {
    settlements: CopySettlement[]
    dustGained: number
    owned: ReadonlyMap<string, CardTier>
  } = { settlements: [], dustGained: 0, owned }
  return pulls.reduce((acc, pull) => {
    const key = copyKey(pull.cardId, pull.variant)
    const current = acc.owned.get(key) ?? null
    const isFirstCopyOfCard =
      !acc.owned.has(copyKey(pull.cardId, 'normal')) && !acc.owned.has(copyKey(pull.cardId, 'foil'))
    const { outcome, dust } = resolvePulledCopy(current, {
      tierAtMint: pull.tier,
      variant: pull.variant,
    })
    const nextOwned =
      outcome === 'duplicate' ? acc.owned : new Map([...acc.owned, [key, pull.tier] as const])
    const settlement: CopySettlement = {
      cardId: pull.cardId,
      variant: pull.variant,
      tierAtMint: pull.tier,
      outcome,
      dust,
      isFirstCopyOfCard,
    }
    return {
      settlements: [...acc.settlements, settlement],
      dustGained: acc.dustGained + dust,
      owned: nextOwned,
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

/** Decides whether a member may upgrade their normal copy to foil, priced on that copy's tier at mint. */
export function foilUpgradeDecision(input: {
  currentTier: CardTier
  normalTierAtMint: CardTier | null
  ownsFoil: boolean
  dust: number
}): { cost: number; allowed: boolean; reason: FoilUpgradeBlock | null } {
  const cost = foilUpgradeCost(input.normalTierAtMint ?? input.currentTier)
  const block = (reason: FoilUpgradeBlock) => ({ cost, allowed: false, reason })
  if (input.normalTierAtMint === null) return block('no_normal')
  if (input.ownsFoil) return block('foil_owned')
  if (input.dust < cost) return block('insufficient_dust')
  return { cost, allowed: true, reason: null }
}
