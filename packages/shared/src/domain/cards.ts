export const CARD_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as const

export type CardTier = (typeof CARD_TIERS)[number]

export const CARD_TITLE_MAX_LENGTH = 40

export const COMPUTED_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as const

export type ComputedTier = (typeof COMPUTED_TIERS)[number]

export const BOUND_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const

export type BoundTier = (typeof BOUND_TIERS)[number]

export const PROVISIONAL_TIER: ComputedTier = 'common'

export const DEFAULT_NEW_CARD_DELAY_MINUTES = 60

const MS_PER_MINUTE = 60_000

/** Returns the index of the tier in `CARD_TIERS`, from common (0) to mythic. */
export function tierRank(tier: CardTier): number {
  return CARD_TIERS.indexOf(tier)
}

/** Returns the higher of two tiers. */
export function maxTier<T extends CardTier>(a: T, b: T): T {
  return tierRank(a) >= tierRank(b) ? a : b
}

/** Returns the lower of two tiers. */
export function minTier<T extends CardTier>(a: T, b: T): T {
  return tierRank(a) <= tierRank(b) ? a : b
}

/** Returns true when `tier` ranks at or above `min`. */
export function isTierAtLeast(tier: CardTier, min: CardTier): boolean {
  return tierRank(tier) >= tierRank(min)
}

/** Returns the latest creation instant a card may have to enter boosters at `now`. */
export function boosterEligibleBefore(now: Date, delayMinutes: number): Date {
  return new Date(now.getTime() - delayMinutes * MS_PER_MINUTE)
}

/** Returns the instant a card created at `createdAt` enters boosters. */
export function boosterEligibleAt(createdAt: Date, delayMinutes: number): Date {
  return new Date(createdAt.getTime() + delayMinutes * MS_PER_MINUTE)
}

/** Returns true when a card created at `createdAt` may appear in boosters at `now`. */
export function isBoosterEligible(createdAt: Date, now: Date, delayMinutes: number): boolean {
  return createdAt.getTime() <= boosterEligibleBefore(now, delayMinutes).getTime()
}
