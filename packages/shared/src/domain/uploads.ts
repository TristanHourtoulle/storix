export const UPLOAD_MIN_BYTES = 1
export const UPLOAD_MAX_BYTES = 15 * 1024 * 1024
export const UPLOAD_CONTENT_TYPE = 'image/jpeg'
export const UPLOAD_PRESIGN_TTL_SECONDS = 900
export const DEFAULT_UPLOAD_QUOTA_PER_DAY = 10
export const UPLOAD_QUOTA_WINDOW_MS = 86_400_000
export const CLIENT_MAX_EDGE_PX = 2048
export const MIN_CAPTURE_DATE = new Date('1990-01-01T00:00:00Z')

const DAY_MS = 86_400_000

/** Returns how many uploads are still allowed, never below zero. */
export function remainingUploadQuota(input: { limit: number; used: number }): number {
  return Math.max(0, input.limit - input.used)
}

/** Checks whether `requested` uploads fit in the remaining quota. */
export function checkUploadQuota(input: {
  limit: number
  used: number
  requested: number
}): { allowed: true } | { allowed: false; remaining: number } {
  const remaining = remainingUploadQuota(input)
  return input.requested <= remaining ? { allowed: true } : { allowed: false, remaining }
}

/** Returns the start of the rolling 24 h quota window. */
export function uploadQuotaWindowStart(now: Date): Date {
  return new Date(now.getTime() - UPLOAD_QUOTA_WINDOW_MS)
}

/** Returns the capture date when plausible, otherwise null. */
export function sanitizeCaptureDate(raw: Date | null, now: Date): Date | null {
  if (raw === null) return null
  const time = raw.getTime()
  if (Number.isNaN(time)) return null
  if (time < MIN_CAPTURE_DATE.getTime()) return null
  if (time > now.getTime() + DAY_MS) return null
  return raw
}
