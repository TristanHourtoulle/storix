const MINUTE_MS = 60_000

/** Formats the time left until a deadline as short French copy: "3 j 14 h", "9 h 12", "25 min". */
export function formatTimeLeft(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / MINUTE_MS))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const rest = minutes % 60
  if (days > 0) return `${days} j ${hours} h`
  if (hours > 0) return rest > 0 ? `${hours} h ${String(rest).padStart(2, '0')}` : `${hours} h`
  return `${rest} min`
}
