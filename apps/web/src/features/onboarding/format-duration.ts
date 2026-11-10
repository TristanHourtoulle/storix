const MINUTES_PER_HOUR = 60

/** Formats a duration in minutes as short French copy: "30 min", "1 heure", "4 h", "1 h 30". */
export function formatDurationFr(minutes: number): string {
  if (minutes < MINUTES_PER_HOUR) return `${minutes} min`
  const hours = Math.floor(minutes / MINUTES_PER_HOUR)
  const rest = minutes % MINUTES_PER_HOUR
  if (rest > 0) return `${hours} h ${rest}`
  return hours === 1 ? '1 heure' : `${hours} h`
}

/** Formats a recurring cadence: "chaque heure", "toutes les 4 h", "toutes les 30 min". */
export function formatEveryFr(minutes: number): string {
  return minutes === MINUTES_PER_HOUR ? 'chaque heure' : `toutes les ${formatDurationFr(minutes)}`
}
