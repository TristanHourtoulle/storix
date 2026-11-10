const PARIS_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' })
const PARIS_CLOCK = new Intl.DateTimeFormat('fr-FR', {
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
const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

export interface ParisDayGroup<T> {
  key: string
  label: string
  items: T[]
}

/** The Paris calendar day of a date, as "YYYY-MM-DD". */
export function parisDayKey(date: Date): string {
  return PARIS_DAY.format(date)
}

/** "Aujourd'hui", "Hier", "8 nov." or "8 nov. 2025" for a date's Paris calendar day. */
export function parisDayLabel(date: Date, now: Date = new Date()): string {
  const key = parisDayKey(date)
  const today = parisDayKey(now)
  if (key === today) return "Aujourd'hui"
  if (key === parisDayKey(new Date(now.getTime() - DAY_MS))) return 'Hier'
  return (key.slice(0, 4) === today.slice(0, 4) ? DAY_MONTH : DAY_MONTH_YEAR).format(date)
}

/** The Paris wall-clock time of an ISO date, e.g. "14:02". */
export function parisClock(iso: string): string {
  return PARIS_CLOCK.format(new Date(iso))
}

/** "à l'instant", "il y a 12 min", "il y a 2 h", "hier, 21:40" or "8 nov." for an ISO date. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const elapsed = now.getTime() - date.getTime()
  if (elapsed < MINUTE_MS) return "à l'instant"
  if (elapsed < HOUR_MS) return `il y a ${Math.floor(elapsed / MINUTE_MS)} min`
  const key = parisDayKey(date)
  if (key === parisDayKey(now)) return `il y a ${Math.floor(elapsed / HOUR_MS)} h`
  if (key === parisDayKey(new Date(now.getTime() - DAY_MS))) return `hier, ${parisClock(iso)}`
  return DAY_MONTH.format(date)
}

/** Groups items already sorted newest first by the Paris calendar day of their date. */
export function groupByParisDay<T>(
  items: readonly T[],
  dateOf: (item: T) => string,
  now: Date = new Date(),
): ParisDayGroup<T>[] {
  return items.reduce<ParisDayGroup<T>[]>((groups, item) => {
    const date = new Date(dateOf(item))
    const key = parisDayKey(date)
    const last = groups.at(-1)
    if (last?.key === key) {
      return [...groups.slice(0, -1), { ...last, items: [...last.items, item] }]
    }
    return [...groups, { key, label: parisDayLabel(date, now), items: [item] }]
  }, [])
}
