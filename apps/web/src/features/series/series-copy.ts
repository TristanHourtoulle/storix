import type { SeriesKind, SeriesSummary } from '@storix/shared'

const DAY = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  weekday: 'short',
  day: 'numeric',
})
const DAY_MONTH = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})
const HOUR = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: 'numeric' })

const KIND_LABELS: Readonly<Record<SeriesKind, string>> = {
  theme: 'Thème de la semaine',
  event: 'Événement',
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function clean(text: string): string {
  return text.replaceAll('.', '')
}

/** "Thème de la semaine" or "Événement". */
export function seriesKindLabel(kind: SeriesKind): string {
  return KIND_LABELS[kind]
}

/** "Lun 9 – dim 15 nov" for a theme week, "Sam 7 nov · 20h–2h" for an event. */
export function seriesDatesLabel(
  series: Pick<SeriesSummary, 'kind' | 'startsAt' | 'endsAt'>,
): string {
  const start = new Date(series.startsAt)
  const end = new Date(series.endsAt)
  if (series.kind === 'theme') {
    const lastDay = new Date(end.getTime() - 1)
    return capitalize(`${clean(DAY.format(start))} – ${clean(DAY_MONTH.format(lastDay))}`)
  }
  return capitalize(
    `${clean(DAY_MONTH.format(start))} · ${clean(HOUR.format(start))}–${clean(HOUR.format(end))}`,
  ).replaceAll(' h', 'h')
}

/** "J-3", or "Dernier jour" on the last day. */
export function daysLeftLabel(days: number): string {
  return days <= 0 ? 'Dernier jour' : `J-${days}`
}

/** "1 carte", "12 cartes". */
export function cardsLabel(count: number): string {
  return `${count} carte${count > 1 ? 's' : ''}`
}

/** "1 photo · 1 membre", "12 photos · 5 membres". */
export function postsLabel(photos: number, members: number): string {
  return `${photos} photo${photos > 1 ? 's' : ''} · ${members} membre${members > 1 ? 's' : ''}`
}

/** Tells whether a series still takes cards and its total may move. */
export function isSeriesOpen(series: Pick<SeriesSummary, 'phase'>): boolean {
  return series.phase === 'live' || series.phase === 'grace'
}

/** Owned share of a series, in percent. */
export function seriesPercent(series: Pick<SeriesSummary, 'cardCount' | 'ownedCount'>): number {
  return series.cardCount === 0 ? 0 : Math.round((series.ownedCount / series.cardCount) * 100)
}
