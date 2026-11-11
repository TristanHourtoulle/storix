import { tierRank, type CardTier } from '@storix/shared'
import type { RevealAuraKind } from '@/features/cosmetics/cosmetic-skins'
import { DEFAULT_RARITY_PALETTE, type RarityPalette } from '@/features/cosmetics/rarity-palettes'

export type TierKey = 'C' | 'U' | 'R' | 'E' | 'L' | 'M'

export interface TierFx {
  key: TierKey
  level: number
  color: string
  particles: readonly string[]
  auraKind: RevealAuraKind | null
}

const KEYS: Readonly<Record<CardTier, TierKey>> = {
  common: 'C',
  uncommon: 'U',
  rare: 'R',
  epic: 'E',
  legendary: 'L',
  mythic: 'M',
}

export const BRAND_PARTICLES = ['#ffffff', '#a78bfa', '#22d3ee', '#c4b5fd'] as const
export const CONFETTI_PARTICLES = [
  '#a78bfa',
  '#22d3ee',
  '#fbbf24',
  '#f472b6',
  '#4ade80',
  '#ffffff',
] as const

/**
 * Returns the arcade effect settings of a tier, with its level from common (0) to mythic (5),
 * and the particle shape of the worn reveal aura.
 */
export function tierFx(
  tier: CardTier,
  palette: RarityPalette = DEFAULT_RARITY_PALETTE,
  auraKind: RevealAuraKind | null = null,
): TierFx {
  const { fx, particles } = palette.tiers[tier]
  return { key: KEYS[tier], level: tierRank(tier), color: fx, particles, auraKind }
}

/** Returns the short tier key used by the arcade styles (`data-t`). */
export function tierKey(tier: CardTier): TierKey {
  return KEYS[tier]
}
