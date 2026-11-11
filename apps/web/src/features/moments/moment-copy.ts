import { formatMomentLateness } from '@storix/shared'

const FLASH_DATE = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  weekday: 'long',
  day: 'numeric',
  month: 'short',
})

const CLOCK = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  hour: '2-digit',
  minute: '2-digit',
})

/** "Le Moment · mardi 11 nov." */
export function flashEyebrow(firesAt: Date): string {
  return `Le Moment · ${FLASH_DATE.format(firesAt)}`
}

/** "1:48" for the countdown of the 2-minute window. */
export function countdownLabel(remainingMs: number): string {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** "14:33" in Paris time. */
export function clockLabel(date: Date): string {
  return CLOCK.format(date)
}

/** "En retard · 1 h 12" or "À l'heure". */
export function latenessLabel(lateMinutes: number): string {
  return lateMinutes === 0 ? 'À l’heure' : `En retard · ${formatMomentLateness(lateMinutes)}`
}
