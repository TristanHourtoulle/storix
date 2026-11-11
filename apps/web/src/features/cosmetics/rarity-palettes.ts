import type { CardTier } from '@storix/shared'

export type RarityFrame = 'ring' | 'neon' | 'gem' | 'filet'

export type RaritySetKey = 'default' | 'neon' | 'gemmes' | 'filet'

export type GradientStops = readonly (readonly [number, string])[]

export interface TierPalette {
  ring: string
  deep: string
  gem: string
  fx: string
  particles: readonly string[]
}

export interface RarityPalette {
  frame: RarityFrame
  tiers: Readonly<Record<CardTier, TierPalette>>
  mythicRainbow: readonly string[]
  legendaryHeadline: GradientStops
  mythicHeadline: GradientStops
}

const DEFAULT_PALETTE: RarityPalette = {
  frame: 'ring',
  tiers: {
    common: {
      ring: '#a1a1aa',
      deep: '#3f3f46',
      gem: '#a1a1aa',
      fx: '#a1a1aa',
      particles: ['#e4e4e7', '#a1a1aa'],
    },
    uncommon: {
      ring: '#4ade80',
      deep: '#14532d',
      gem: '#4ade80',
      fx: '#4ade80',
      particles: ['#bbf7d0', '#4ade80'],
    },
    rare: {
      ring: '#60a5fa',
      deep: '#1e3a8a',
      gem: '#60a5fa',
      fx: '#60a5fa',
      particles: ['#bfdbfe', '#60a5fa'],
    },
    epic: {
      ring: '#c084fc',
      deep: '#4c1d95',
      gem: '#c084fc',
      fx: '#c084fc',
      particles: ['#f3e8ff', '#c084fc', '#a78bfa'],
    },
    legendary: {
      ring: '#fbbf24',
      deep: '#92400e',
      gem: '#fbbf24',
      fx: '#fbbf24',
      particles: ['#fff7d6', '#fcd34d', '#fbbf24'],
    },
    mythic: {
      ring: '#c084fc',
      deep: '#4a044e',
      gem: '#c084fc',
      fx: '#e879f9',
      particles: ['#f87171', '#fbbf24', '#4ade80', '#22d3ee', '#60a5fa', '#c084fc', '#f472b6'],
    },
  },
  mythicRainbow: ['#f87171', '#fbbf24', '#4ade80', '#22d3ee', '#60a5fa', '#c084fc', '#f87171'],
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

const GEM_MYTHIC_RAINBOW = [
  '#fecaca',
  '#fef08a',
  '#bbf7d0',
  '#a5f3fc',
  '#c7d2fe',
  '#f5d0fe',
  '#fecaca',
] as const

export const RARITY_PALETTES: Readonly<Record<RaritySetKey, RarityPalette>> = {
  default: DEFAULT_PALETTE,
  neon: { ...DEFAULT_PALETTE, frame: 'neon' },
  gemmes: { ...DEFAULT_PALETTE, frame: 'gem', mythicRainbow: GEM_MYTHIC_RAINBOW },
  filet: { ...DEFAULT_PALETTE, frame: 'filet' },
}

export const DEFAULT_RARITY_PALETTE: RarityPalette = DEFAULT_PALETTE
