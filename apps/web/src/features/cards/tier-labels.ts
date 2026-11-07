import type { CardTier } from '@storix/shared'

export const TIER_LABELS: Record<CardTier, string> = {
  common: 'Commune',
  uncommon: 'Peu commune',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
  mythic: 'Mythique',
}

export const TIER_CLASS: Record<CardTier, string> = {
  common: 't-C',
  uncommon: 't-U',
  rare: 't-R',
  epic: 't-E',
  legendary: 't-L',
  mythic: 't-M',
}

export const TIER_GLOW_CLASS: Record<CardTier, string> = {
  common: 'g-C',
  uncommon: 'g-U',
  rare: 'g-R',
  epic: 'g-E',
  legendary: 'g-L',
  mythic: 'g-M',
}

export const TIER_COLOR_VAR: Record<CardTier, string> = {
  common: 'var(--color-tier-common)',
  uncommon: 'var(--color-tier-uncommon)',
  rare: 'var(--color-tier-rare)',
  epic: 'var(--color-tier-epic)',
  legendary: 'var(--color-tier-legendary)',
  mythic: 'var(--color-tier-mythic)',
}
