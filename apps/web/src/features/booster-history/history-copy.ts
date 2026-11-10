import type { BoosterHistoryOpening, BoosterHistoryPull } from '@storix/shared'

const PARIS_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' })
const PARIS_TIME = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  hour: '2-digit',
  minute: '2-digit',
})
const DAY_MONTH = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  day: 'numeric',
  month: 'short',
})
const DAY_MONTH_YEAR = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const DAY_MS = 86_400_000

export interface HistoryDayGroup {
  key: string
  label: string
  openings: BoosterHistoryOpening[]
}

function dayLabel(date: Date, now: Date): string {
  const key = PARIS_DAY.format(date)
  if (key === PARIS_DAY.format(now)) return "Aujourd'hui"
  if (key === PARIS_DAY.format(new Date(now.getTime() - DAY_MS))) return 'Hier'
  const sameYear = key.slice(0, 4) === PARIS_DAY.format(now).slice(0, 4)
  return (sameYear ? DAY_MONTH : DAY_MONTH_YEAR).format(date)
}

/** Groups openings, newest first, by their Paris calendar day. */
export function groupByDay(
  openings: readonly BoosterHistoryOpening[],
  now: Date = new Date(),
): HistoryDayGroup[] {
  return openings.reduce<HistoryDayGroup[]>((groups, opening) => {
    const date = new Date(opening.openedAt)
    const key = PARIS_DAY.format(date)
    const last = groups.at(-1)
    if (last?.key === key) {
      return [...groups.slice(0, -1), { ...last, openings: [...last.openings, opening] }]
    }
    return [...groups, { key, label: dayLabel(date, now), openings: [opening] }]
  }, [])
}

/** Formats the opening time in Paris, e.g. "14:02". */
export function openingTime(iso: string): string {
  return PARIS_TIME.format(new Date(iso))
}

/** Labels what a pull gave: new card, upgrade, stacked duplicate or dust from an older booster. */
export function pullOutcomeLabel(pull: BoosterHistoryPull): string {
  if (pull.outcome === 'new') return pull.isDiscovery ? 'découverte' : 'nouvelle'
  if (pull.outcome === 'upgraded') return 'améliorée'
  if (pull.stackCount !== null) return `doublon ×${pull.stackCount}`
  return pull.dust > 0 ? `+${pull.dust} paillettes` : 'doublon'
}

/** The pull's card title when the viewer may see it. */
export function pullTitle(pull: BoosterHistoryPull): string {
  if (pull.card === null) return 'Carte retirée'
  if (pull.card.kind === 'owned') return `« ${pull.card.title} »`
  return `Carte n°${pull.card.number}`
}
