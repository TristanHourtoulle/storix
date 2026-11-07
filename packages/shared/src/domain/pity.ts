import { type CardTier, isTierAtLeast } from './cards'

export interface PityState {
  sinceEpic: number
  sinceLegendary: number
}

export const PITY_EPIC_AFTER = 10
export const PITY_LEGENDARY_AFTER = 25
export const PITY_LEGENDARY_STEP_PERCENT = 1

/** Returns true when the next booster must contain an Epic or better. */
export function isEpicGuaranteed(p: PityState): boolean {
  return p.sinceEpic >= PITY_EPIC_AFTER - 1
}

/** Returns the Legendary percent added to the rare+ slot of the next booster. */
export function legendaryBonusPercent(p: PityState): number {
  return Math.max(0, p.sinceLegendary - PITY_LEGENDARY_AFTER + 1) * PITY_LEGENDARY_STEP_PERCENT
}

/** Summarizes the pity counters for display. */
export function pitySummary(p: PityState): {
  epicGuaranteeIn: number
  epicProgress: number
  legendaryBonusPercent: number
} {
  return {
    epicGuaranteeIn: Math.max(1, PITY_EPIC_AFTER - p.sinceEpic),
    epicProgress: Math.min(1, p.sinceEpic / PITY_EPIC_AFTER),
    legendaryBonusPercent: legendaryBonusPercent(p),
  }
}

/** Advances or resets the pity counters from the tiers minted by one booster. */
export function nextPityState(p: PityState, mintedTiers: readonly CardTier[]): PityState {
  const gotEpic = mintedTiers.some((tier) => isTierAtLeast(tier, 'epic'))
  const gotLegendary = mintedTiers.some((tier) => isTierAtLeast(tier, 'legendary'))
  return {
    sinceEpic: gotEpic ? 0 : p.sinceEpic + 1,
    sinceLegendary: gotLegendary ? 0 : p.sinceLegendary + 1,
  }
}
