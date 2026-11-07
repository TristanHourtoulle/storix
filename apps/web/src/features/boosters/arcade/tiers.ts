import { tierRank, type CardTier } from '@storix/shared'

export type TierKey = 'C' | 'U' | 'R' | 'E' | 'L' | 'M'

export interface TierFx {
  key: TierKey
  level: number
  color: string
  particles: readonly string[]
}

const FX: Record<CardTier, Omit<TierFx, 'level'>> = {
  common: { key: 'C', color: '#a1a1aa', particles: ['#e4e4e7', '#a1a1aa'] },
  uncommon: { key: 'U', color: '#4ade80', particles: ['#bbf7d0', '#4ade80'] },
  rare: { key: 'R', color: '#60a5fa', particles: ['#bfdbfe', '#60a5fa'] },
  epic: { key: 'E', color: '#c084fc', particles: ['#f3e8ff', '#c084fc', '#a78bfa'] },
  legendary: { key: 'L', color: '#fbbf24', particles: ['#fff7d6', '#fcd34d', '#fbbf24'] },
  mythic: {
    key: 'M',
    color: '#e879f9',
    particles: ['#f87171', '#fbbf24', '#4ade80', '#22d3ee', '#60a5fa', '#c084fc', '#f472b6'],
  },
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

/** Returns the arcade effect settings of a tier, with its level from common (0) to mythic (5). */
export function tierFx(tier: CardTier): TierFx {
  return { ...FX[tier], level: tierRank(tier) }
}

/** Returns the short tier key used by the arcade styles (`data-t`). */
export function tierKey(tier: CardTier): TierKey {
  return FX[tier].key
}
