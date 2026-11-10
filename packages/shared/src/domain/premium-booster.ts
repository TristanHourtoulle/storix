export const PREMIUM_BOOSTER_EVERY = 20

/** Returns true when the next booster, after `boostersOpenedBefore` openings, is premium. */
export function isPremiumBooster(boostersOpenedBefore: number): boolean {
  return (boostersOpenedBefore + 1) % PREMIUM_BOOSTER_EVERY === 0
}

/** Summarizes how many boosters remain until the next premium one, for display. */
export function premiumSummary(boostersOpened: number): {
  boostersUntil: number
  progress: number
} {
  const position = boostersOpened % PREMIUM_BOOSTER_EVERY
  return {
    boostersUntil: PREMIUM_BOOSTER_EVERY - position,
    progress: position / PREMIUM_BOOSTER_EVERY,
  }
}
