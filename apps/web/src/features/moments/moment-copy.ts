import { formatMomentLateness } from '@storix/shared'

const FLASH_DATE = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  weekday: 'long',
  day: 'numeric',
  month: 'short',
})

const TITLE_DATE = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  day: 'numeric',
  month: 'long',
})

/** "Le Moment · mardi 11 nov." */
export function flashEyebrow(firesAt: Date): string {
  return `Le Moment · ${FLASH_DATE.format(firesAt)}`
}

/** "Moment du 11 novembre", the title the server gives a Moment card posted without one. */
export function momentAutoTitle(firesAt: Date): string {
  return `Moment du ${TITLE_DATE.format(firesAt)}`
}

/** "1:48" for the countdown of the 2-minute window. */
export function countdownLabel(remainingMs: number): string {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** "En retard · 1 h 12" or "À l'heure". */
export function latenessLabel(lateMinutes: number): string {
  return lateMinutes === 0 ? 'À l’heure' : `En retard · ${formatMomentLateness(lateMinutes)}`
}
