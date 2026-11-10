import { DEFAULT_AUDIT_CATEGORIES, type AuditCategory } from '@storix/shared'

export const JOURNAL_CHIPS = ['all', 'members', 'cards', 'settings', 'security'] as const
export const JOURNAL_PERIODS = ['7', '30', 'all'] as const

export type JournalChip = (typeof JOURNAL_CHIPS)[number]
export type JournalPeriod = (typeof JOURNAL_PERIODS)[number]

export interface JournalFilters {
  chip: JournalChip
  actorId: string | null
  period: JournalPeriod
  withEconomy: boolean
}

export const DEFAULT_JOURNAL_FILTERS: JournalFilters = {
  chip: 'all',
  actorId: null,
  period: '30',
  withEconomy: false,
}

export const JOURNAL_CHIP_LABELS: Record<JournalChip, string> = {
  all: 'Tout',
  members: 'Membres',
  cards: 'Cartes',
  settings: 'Réglages',
  security: 'Sécurité',
}

export const JOURNAL_PERIOD_LABELS: Record<JournalPeriod, string> = {
  '7': '7 jours',
  '30': '30 jours',
  all: 'Tout',
}

const DAY_MS = 86_400_000

/** The audit categories a filter set asks for; "Tout" includes accounts and, on demand, the economy. */
export function journalCategories(filters: JournalFilters): AuditCategory[] {
  if (filters.chip !== 'all') return [filters.chip]
  return filters.withEconomy
    ? [...DEFAULT_AUDIT_CATEGORIES, 'economy']
    : [...DEFAULT_AUDIT_CATEGORIES]
}

/** The ISO lower bound of the period, or null to keep the server's 30-day default. */
export function journalFrom(period: JournalPeriod, now: Date = new Date()): string | null {
  if (period === '30') return null
  if (period === 'all') return new Date(0).toISOString()
  return new Date(now.getTime() - 7 * DAY_MS).toISOString()
}

/** Counts the filters set in the "⋯" sheet, for the chip label. */
export function sheetFilterCount(filters: JournalFilters): number {
  return (
    (filters.actorId === null ? 0 : 1) +
    (filters.period === '30' ? 0 : 1) +
    (filters.withEconomy ? 1 : 0)
  )
}
