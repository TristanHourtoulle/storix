/** Formats a minute count as a short French duration such as "4 h" or "1 h 30". */
export function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return ''
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const rest = minutes % 60
  if (days > 0)
    return [`${days} j`, hours > 0 ? `${hours} h` : '', rest > 0 ? `${rest} min` : '']
      .filter(Boolean)
      .join(' ')
  if (hours > 0) return rest > 0 ? `${hours} h ${rest}` : `${hours} h`
  return `${rest} min`
}
