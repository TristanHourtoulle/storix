import { CARD_TIERS, type CardTier, maxTier, tierRank } from './cards'
import { type CopyVariant, DUST_VALUES, dustValue } from './dust'

export const PROMOTION_COPIES = 10
export const PROMOTION_COST_MULTIPLIER = 2

export interface OwnedCopyState {
  variant: CopyVariant
  tierAtMint: CardTier
  promotedTier: CardTier | null
}

export interface StackEntry {
  variant: CopyVariant
  tierAtMint: CardTier
  count: number
}

export type PromotionBlock = 'not_owned' | 'max_tier' | 'not_enough_copies' | 'insufficient_dust'

export interface PromotionDecision {
  variant: CopyVariant | null
  from: CardTier
  to: CardTier | null
  cost: number | null
  copiesRequired: number
  copiesAvailable: number
  allowed: boolean
  reason: PromotionBlock | null
}

export type StackTakeOrder = 'cheapest' | 'richest'

export interface StackTake {
  taken: StackEntry[]
  remaining: StackEntry[]
  dust: number
}

/** Returns the tier one step above `tier`, or null for mythic. */
export function nextTier(tier: CardTier): CardTier | null {
  return CARD_TIERS[tierRank(tier) + 1] ?? null
}

/** Returns the dust needed for a personal step to the `target` tier. */
export function promotionCost(target: CardTier): number {
  return DUST_VALUES[target] * PROMOTION_COST_MULTIPLIER
}

/** Returns the tier a copy is valued at: its tier at mint, or its personal tier when higher. */
export function copyValueTier(copy: Pick<OwnedCopyState, 'tierAtMint' | 'promotedTier'>): CardTier {
  return copy.promotedTier === null ? copy.tierAtMint : maxTier(copy.tierAtMint, copy.promotedTier)
}

/** Returns the dust a copy is worth, from its value tier, doubled for foil. */
export function copyDustValue(copy: OwnedCopyState): number {
  return dustValue(copyValueTier(copy), copy.variant)
}

/** Returns the tier shown for a copy: its tier at mint, or for a promoted copy never below the league tier. */
export function shownCopyTier(copy: OwnedCopyState, leagueTier: CardTier): CardTier {
  if (copy.promotedTier === null) return copy.tierAtMint
  return maxTier(maxTier(copy.promotedTier, leagueTier), copy.tierAtMint)
}

/** Returns the tier shown for a card to its owner: the best of their copies, else the league tier. */
export function personalDisplayTier(
  copies: readonly OwnedCopyState[],
  leagueTier: CardTier,
): CardTier {
  const [first, ...rest] = copies.map((copy) => shownCopyTier(copy, leagueTier))
  if (first === undefined) return leagueTier
  return rest.reduce<CardTier>((best, tier) => maxTier(best, tier), first)
}

/** Returns true when any of the copies carries a personal tier. */
export function isPromoted(copies: readonly OwnedCopyState[]): boolean {
  return copies.some((copy) => copy.promotedTier !== null)
}

/** Returns the variant a promotion applies to: foil when owned, else normal, else null. */
export function promotionVariant(copies: readonly OwnedCopyState[]): CopyVariant | null {
  if (copies.some((copy) => copy.variant === 'foil')) return 'foil'
  if (copies.some((copy) => copy.variant === 'normal')) return 'normal'
  return null
}

/** Returns the number of stacked copies, optionally of one variant only. */
export function stackSize(entries: readonly StackEntry[], variant?: CopyVariant): number {
  return entries
    .filter((entry) => variant === undefined || entry.variant === variant)
    .reduce((sum, entry) => sum + entry.count, 0)
}

const variantRank = (variant: CopyVariant): number => (variant === 'normal' ? 0 : 1)

const compareCheapest = (a: StackEntry, b: StackEntry): number =>
  dustValue(a.tierAtMint, a.variant) - dustValue(b.tierAtMint, b.variant) ||
  tierRank(a.tierAtMint) - tierRank(b.tierAtMint) ||
  variantRank(a.variant) - variantRank(b.variant)

const compareRichest = (a: StackEntry, b: StackEntry): number =>
  tierRank(b.tierAtMint) - tierRank(a.tierAtMint) ||
  dustValue(b.tierAtMint, b.variant) - dustValue(a.tierAtMint, a.variant)

/** Plans which stacked copies to take, cheapest or richest first, or null when the stack is too small. */
export function planStackTake(
  entries: readonly StackEntry[],
  quantity: number,
  order: StackTakeOrder,
  variant?: CopyVariant,
): StackTake | null {
  if (!Number.isInteger(quantity) || quantity < 1) return null
  if (stackSize(entries, variant) < quantity) return null
  const compare = order === 'cheapest' ? compareCheapest : compareRichest
  const candidates = entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => variant === undefined || entry.variant === variant)
    .toSorted((a, b) => compare(a.entry, b.entry))
  const initial: { left: number; takes: ReadonlyMap<number, number> } = {
    left: quantity,
    takes: new Map(),
  }
  const { takes } = candidates.reduce((acc, { entry, index }) => {
    const count = Math.min(entry.count, acc.left)
    if (count <= 0) return acc
    return { left: acc.left - count, takes: new Map([...acc.takes, [index, count] as const]) }
  }, initial)
  const taken = candidates.flatMap(({ entry, index }) => {
    const count = takes.get(index)
    return count === undefined ? [] : [{ ...entry, count }]
  })
  const remaining = entries
    .map((entry, index) => ({ ...entry, count: entry.count - (takes.get(index) ?? 0) }))
    .filter((entry) => entry.count > 0)
  const dust = taken.reduce(
    (sum, entry) => sum + dustValue(entry.tierAtMint, entry.variant) * entry.count,
    0,
  )
  return { taken, remaining, dust }
}

/** Decides whether a member may raise the personal tier of their copy by one step. */
export function promotionDecision(input: {
  copies: readonly OwnedCopyState[]
  leagueTier: CardTier
  stack: readonly StackEntry[]
  dust: number
}): PromotionDecision {
  const from = maxTier(personalDisplayTier(input.copies, input.leagueTier), input.leagueTier)
  const to = nextTier(from)
  const cost = to === null ? null : promotionCost(to)
  const copiesAvailable = stackSize(input.stack)
  const decision = {
    variant: promotionVariant(input.copies),
    from,
    to,
    cost,
    copiesRequired: PROMOTION_COPIES,
    copiesAvailable,
  }
  const block = (reason: PromotionBlock): PromotionDecision => ({
    ...decision,
    allowed: false,
    reason,
  })
  if (decision.variant === null) return block('not_owned')
  if (cost === null) return block('max_tier')
  if (copiesAvailable < PROMOTION_COPIES) return block('not_enough_copies')
  if (input.dust < cost) return block('insufficient_dust')
  return { ...decision, allowed: true, reason: null }
}
