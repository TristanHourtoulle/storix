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
