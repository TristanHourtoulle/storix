export const CARD_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as const

export type CardTier = (typeof CARD_TIERS)[number]

export const PROVISIONAL_TIER: CardTier = 'common'

export const CARD_TITLE_MAX_LENGTH = 40

export const COMPUTED_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const

export type ComputedTier = (typeof COMPUTED_TIERS)[number]

export const BOOSTER_ELIGIBILITY_DELAY_MS = 12 * 3_600_000

/** Returns the index of the tier in `CARD_TIERS`, from common (0) to mythic. */
export function tierRank(tier: CardTier): number {
  return CARD_TIERS.indexOf(tier)
}

/** Returns the higher of two tiers. */
export function maxTier(a: CardTier, b: CardTier): CardTier {
  return tierRank(a) >= tierRank(b) ? a : b
}

/** Returns the lower of two tiers. */
export function minTier(a: CardTier, b: CardTier): CardTier {
  return tierRank(a) <= tierRank(b) ? a : b
}

/** Returns true when `tier` ranks at or above `min`. */
export function isTierAtLeast(tier: CardTier, min: CardTier): boolean {
  return tierRank(tier) >= tierRank(min)
}

/** Returns the latest creation instant a card may have to enter boosters at `now`. */
export function boosterEligibleBefore(now: Date): Date {
  return new Date(now.getTime() - BOOSTER_ELIGIBILITY_DELAY_MS)
}

/** Returns true when a card created at `createdAt` may appear in boosters at `now`. */
export function isBoosterEligible(createdAt: Date, now: Date): boolean {
  return createdAt.getTime() <= boosterEligibleBefore(now).getTime()
}
