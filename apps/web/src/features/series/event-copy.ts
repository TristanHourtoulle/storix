import { parisDayKey, type EventWindowCheck } from '@storix/shared'

const TIME = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  hour: 'numeric',
  minute: '2-digit',
})
const WEEKDAY = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' })
const DAY_MONTH = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const DAY_MS = 86_400_000

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** "2:00" in Paris time. */
export function parisTime(date: Date): string {
  return TIME.format(date)
}

/** "Auj. 20:00", "Demain 02:00", "Sam. 10:00" or "Sam. 21 nov. 10:00", in Paris time. */
export function parisMoment(date: Date, now: Date): string {
  const days = Math.round((Date.parse(parisDayKey(date)) - Date.parse(parisDayKey(now))) / DAY_MS)
  const time = parisTime(date)
  if (days === 0) return `Auj. ${time}`
  if (days === 1) return `Demain ${time}`
  if (days > 1 && days < 7) return `${capitalize(WEEKDAY.format(date))} ${time}`
  return `${capitalize(DAY_MONTH.format(date))} ${time}`
}

/** "jusqu'à 2:00". */
export function untilLabel(endsAt: Date): string {
  return `jusqu'à ${parisTime(endsAt)}`
}

const WINDOW_ERRORS: Readonly<Record<Exclude<EventWindowCheck, 'ok'>, string>> = {
  too_short: 'Un événement dure au moins 30 min.',
  too_long: 'Un événement dure au plus 48 h.',
  in_past: 'Le début est déjà passé.',
  too_far: 'Le début doit être dans les 30 jours.',
}

/** French message of an invalid event window. */
export function windowError(check: EventWindowCheck): string | null {
  return check === 'ok' ? null : WINDOW_ERRORS[check]
}
