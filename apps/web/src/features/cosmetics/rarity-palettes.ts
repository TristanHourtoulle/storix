import type { CardTier } from '@storix/shared'

export type RarityFrame = 'ring' | 'neon' | 'gem' | 'filet'

export type RaritySetKey = 'default'

export type GradientStops = readonly (readonly [number, string])[]

export interface TierPalette {
  ring: string
  gem: string
  fx: string
  particles: readonly string[]
}

export interface RarityPalette {
  frame: RarityFrame
  tiers: Readonly<Record<CardTier, TierPalette>>
  mythicRainbow: readonly string[]
  arcadeRainbow: readonly string[]
  legendaryHeadline: GradientStops
  mythicHeadline: GradientStops
}

const DEFAULT_PALETTE: RarityPalette = {
  frame: 'ring',
  tiers: {
    common: {
      ring: '#a1a1aa',
      gem: '#a1a1aa',
      fx: '#a1a1aa',
      particles: ['#e4e4e7', '#a1a1aa'],
    },
    uncommon: {
      ring: '#4ade80',
      gem: '#4ade80',
      fx: '#4ade80',
      particles: ['#bbf7d0', '#4ade80'],
    },
    rare: {
      ring: '#60a5fa',
      gem: '#60a5fa',
      fx: '#60a5fa',
      particles: ['#bfdbfe', '#60a5fa'],
    },
    epic: {
      ring: '#c084fc',
      gem: '#c084fc',
      fx: '#c084fc',
      particles: ['#f3e8ff', '#c084fc', '#a78bfa'],
    },
    legendary: {
      ring: '#fbbf24',
      gem: '#fbbf24',
      fx: '#fbbf24',
      particles: ['#fff7d6', '#fcd34d', '#fbbf24'],
    },
    mythic: {
      ring: '#c084fc',
      gem: '#c084fc',
      fx: '#e879f9',
      particles: ['#f87171', '#fbbf24', '#4ade80', '#22d3ee', '#60a5fa', '#c084fc', '#f472b6'],
    },
  },
  mythicRainbow: ['#f87171', '#fbbf24', '#4ade80', '#22d3ee', '#60a5fa', '#c084fc', '#f87171'],
  arcadeRainbow: [
    '#f87171',
    '#fbbf24',
    '#4ade80',
    '#22d3ee',
    '#60a5fa',
    '#c084fc',
    '#f472b6',
    '#f87171',
  ],
  legendaryHeadline: [
    [0, '#fcd34d'],
    [0.5, '#fbbf24'],
    [1, '#f59e0b'],
  ],
  mythicHeadline: [
    [0, '#f87171'],
    [0.33, '#fbbf24'],
    [0.66, '#22d3ee'],
    [1, '#c084fc'],
  ],
}

export const RARITY_PALETTES: Readonly<Record<RaritySetKey, RarityPalette>> = {
  default: DEFAULT_PALETTE,
}

export const DEFAULT_RARITY_PALETTE: RarityPalette = DEFAULT_PALETTE

const TIER_TOKEN: Readonly<Record<CardTier, string>> = {
  common: '--color-tier-common',
  uncommon: '--color-tier-uncommon',
  rare: '--color-tier-rare',
  epic: '--color-tier-epic',
  legendary: '--color-tier-legendary',
  mythic: '--color-tier-mythic',
}

const RAINBOW_TOKENS = [
  '--rainbow-red',
  '--rainbow-gold',
  '--rainbow-green',
  '--rainbow-cyan',
  '--rainbow-blue',
  '--rainbow-violet',
  '--rainbow-pink',
] as const

/** Returns the CSS custom properties a palette sets on a subtree, so DOM styles follow it. */
export function rarityCssVars(palette: RarityPalette): Readonly<Record<string, string>> {
  const tierVars = Object.fromEntries(
    (Object.keys(TIER_TOKEN) as CardTier[]).map((tier) => [
      TIER_TOKEN[tier],
      palette.tiers[tier].ring,
    ]),
  )
  const rainbowVars = Object.fromEntries(
    RAINBOW_TOKENS.map((token, index) => [
      token,
      palette.arcadeRainbow[index] ?? palette.arcadeRainbow[0] ?? '',
    ]),
  )
  return {
    ...tierVars,
    ...rainbowVars,
    '--color-tier-mythic-fx': palette.tiers.mythic.fx,
  }
}
