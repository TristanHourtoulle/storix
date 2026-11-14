import { type CardTier, isTierAtLeast } from './cards'

export const CHARM_IDS = ['trefle', 'trefle-or', 'boussole', 'aimant', 'eclat', 'tamis'] as const

export type CharmId = (typeof CHARM_IDS)[number]

export type CharmKind = 'luck' | 'collection' | 'foil' | 'dust'

export interface CharmItem {
  id: CharmId
  name: string
  kind: CharmKind
  price: number
}

export interface ActiveCharm {
  id: CharmId
  charges: number
}

export type CharmPurchaseDecision =
  | 'ok'
  | 'already_active'
  | 'needs_replace'
  | 'weekly_limit'
  | 'insufficient_dust'

export const CHARM_CHARGES = 10
export const CHARM_WEEKLY_LIMIT = 3
export const CHARM_WEEK_MS = 7 * 24 * 3_600_000
export const CHARM_COLLECTION_ODDS = 4
export const CHARM_FOIL_ODDS = 12
export const CHARM_WEIGHT_SCALE = 100

export const CHARM_CATALOG: readonly CharmItem[] = [
  { id: 'trefle', name: 'Trèfle', kind: 'luck', price: 2000 },
  { id: 'trefle-or', name: "Trèfle d'or", kind: 'luck', price: 3500 },
  { id: 'boussole', name: 'Boussole', kind: 'collection', price: 2000 },
  { id: 'aimant', name: 'Aimant', kind: 'collection', price: 1500 },
  { id: 'eclat', name: 'Éclat', kind: 'foil', price: 1800 },
  { id: 'tamis', name: 'Tamis', kind: 'dust', price: 1500 },
]

type TierDeltas = Readonly<Partial<Record<CardTier, number>>>

const STANDARD_DELTAS: Readonly<Partial<Record<CharmId, TierDeltas>>> = {
  trefle: { legendary: 175, mythic: 25 },
  'trefle-or': { legendary: 200, mythic: 100 },
}

const PREMIUM_DELTAS: Readonly<Partial<Record<CharmId, TierDeltas>>> = {
  trefle: { mythic: 375 },
  'trefle-or': { mythic: 1000 },
}

const DONOR_TIERS: Readonly<Record<'standard' | 'premium', readonly CardTier[]>> = {
  standard: ['rare', 'epic'],
  premium: ['legendary'],
}

/** Returns the catalogue charm with this id, or undefined when it does not exist. */
export function findCharm(id: string): CharmItem | undefined {
  return CHARM_CATALOG.find((charm) => charm.id === id)
}

/** Tells whether a string is a known charm id. */
export function isCharmId(id: string): id is CharmId {
  return findCharm(id) !== undefined
}

/** Decides whether a member can buy a charm right now. */
export function charmPurchaseDecision(input: {
  charm: CharmItem
  active: ActiveCharm | null
  replace: boolean
  purchasesThisWeek: number
  dust: number
}): CharmPurchaseDecision {
  if (input.active?.id === input.charm.id) return 'already_active'
  if (input.active !== null && !input.replace) return 'needs_replace'
  if (input.purchasesThisWeek >= CHARM_WEEKLY_LIMIT) return 'weekly_limit'
  if (input.dust < input.charm.price) return 'insufficient_dust'
  return 'ok'
}

/** Returns the active charm after one booster spent a charge, or null once it runs out. */
export function spendCharmCharge(active: ActiveCharm | null): ActiveCharm | null {
  if (active === null || active.charges <= 1) return null
  return { id: active.id, charges: active.charges - 1 }
}

/**
 * Applies a luck charm to the last slot of a booster. Weights are scaled to basis points and the added
 * weight is taken from the donor tiers in order, so the total never changes. Returns null when the
 * charm does not touch this slot, so the caller keeps the original integer weights.
 */
export function charmSlotWeights(
  weights: Readonly<Partial<Record<CardTier, number>>>,
  charm: CharmId,
  table: 'standard' | 'premium',
): Partial<Record<CardTier, number>> | null {
  const deltas = (table === 'standard' ? STANDARD_DELTAS : PREMIUM_DELTAS)[charm]
  if (deltas === undefined) return null
  const scaled = Object.fromEntries(
    Object.entries(weights).map(([tier, weight]) => [tier, (weight ?? 0) * CHARM_WEIGHT_SCALE]),
  ) as Partial<Record<CardTier, number>>
  const added = Object.values(deltas).reduce((sum, delta) => sum + (delta ?? 0), 0)
  const withAdded = Object.entries(deltas).reduce<Partial<Record<CardTier, number>>>(
    (acc, [tier, delta]) => ({ ...acc, [tier]: (acc[tier as CardTier] ?? 0) + (delta ?? 0) }),
    scaled,
  )
  const { result } = DONOR_TIERS[table].reduce(
    (acc, tier) => {
      const available = acc.result[tier] ?? 0
      const taken = Math.min(available, acc.left)
      return { left: acc.left - taken, result: { ...acc.result, [tier]: available - taken } }
    },
    { left: added, result: withAdded },
  )
  return result
}

/** Foil odds (1 in N) for every card of a booster opened with this charm. */
export function charmFoilOdds(charm: CharmId | null, baseOdds: number): number {
  return charm === 'eclat' ? CHARM_FOIL_ODDS : baseOdds
}

/** Dust paid by a stacked copy once the charm applies. */
export function charmDust(dust: number, charm: CharmId | null): number {
  return charm === 'tamis' ? Math.round((dust * 5) / 4) : dust
}

/** Whether a pull counts as touched by a charm, for the dot on the card and the summary count. */
export function isPullCharmBoosted(input: {
  charm: CharmId | null
  slot: number
  lastSlot: number
  tier: CardTier
  variant: 'normal' | 'foil'
  dust: number
  isRedirected: boolean
}): boolean {
  switch (input.charm) {
    case 'trefle':
    case 'trefle-or':
      return input.slot === input.lastSlot && isTierAtLeast(input.tier, 'legendary')
    case 'boussole':
    case 'aimant':
      return input.isRedirected
    case 'eclat':
      return input.variant === 'foil'
    case 'tamis':
      return input.dust > 0
    case null:
      return false
  }
}

/** Number of purchases inside the rolling weekly window ending at `now`. */
export function charmPurchasesInWeek(purchasedAt: readonly Date[], now: Date): number {
  const since = now.getTime() - CHARM_WEEK_MS
  return purchasedAt.filter((at) => at.getTime() > since).length
}
