import type { CSSProperties } from 'react'
import type { CardTier } from '@storix/shared'
import { TIER_COLOR_VAR } from '@/features/cards/tier-labels'

const JOINED_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

export const TIER_SHORT_LABELS: Record<CardTier, string> = {
  common: 'Com.',
  uncommon: 'P. com.',
  rare: 'Rare',
  epic: 'Épi.',
  legendary: 'Lég.',
  mythic: 'Myth.',
}

/** "Membre depuis le 3 nov." from the date a member joined the league. */
export function joinedLabel(joinedAt: string): string {
  return `Membre depuis le ${JOINED_FORMAT.format(new Date(joinedAt))}`
}

/** Inline style exposing a tier colour as `--tc`, for tier-tinted chrome outside cards. */
export function tierColorStyle(tier: CardTier | null): CSSProperties {
  return { '--tc': tier ? TIER_COLOR_VAR[tier] : 'var(--color-accent)' } as CSSProperties
}

/** Singular or plural noun for a count, e.g. "photo" for 1, "photos" for 18. */
export function pluralOf(count: number, one: string, many: string): string {
  return count > 1 ? many : one
}

/** Singular or plural noun after a count, e.g. "1 photo", "18 photos". */
export function countOf(count: number, one: string, many: string): string {
  return `${count} ${pluralOf(count, one, many)}`
}
