import type { CardPerson } from '@storix/shared'

const SUMMARY_NAMES = 2
const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MONTH = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
const PARIS_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' })

/** Returns the reactor's name, or "Ancien membre" once they left the league. */
export function reactorName(person: CardPerson): string {
  return person.displayUsername ?? 'Ancien membre'
}

/** Builds "Léa, Tom et 3 autres ont réagi" from the reactors' names, newest first. */
export function reactorsSummary(names: readonly string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return `${names[0]} a réagi`
  if (names.length <= SUMMARY_NAMES + 1) {
    return `${names.slice(0, -1).join(', ')} et ${names.at(-1)} ont réagi`
  }
  const others = names.length - SUMMARY_NAMES
  return `${names.slice(0, SUMMARY_NAMES).join(', ')} et ${others} autres ont réagi`
}

/** Formats a reaction date as "à l'instant", "il y a 2 h", "hier" or "8 nov.". */
export function reactedAgo(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const elapsed = now.getTime() - date.getTime()
  if (elapsed < MINUTE_MS) return "à l'instant"
  if (elapsed < HOUR_MS) return `il y a ${Math.floor(elapsed / MINUTE_MS)} min`
  const today = PARIS_DAY.format(now)
  if (PARIS_DAY.format(date) === today) return `il y a ${Math.floor(elapsed / HOUR_MS)} h`
  const yesterday = PARIS_DAY.format(new Date(now.getTime() - 24 * HOUR_MS))
  if (PARIS_DAY.format(date) === yesterday) return 'hier'
  return DAY_MONTH.format(date)
}
