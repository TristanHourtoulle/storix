import { sanitizeCaptureDate } from './uploads'

const OFFSET_PATTERN = /^([+-])(\d{2}):?(\d{2})$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

function parseOffsetMinutes(raw: unknown): number | null {
  if (typeof raw !== 'string') return null
  const match = OFFSET_PATTERN.exec(raw.trim())
  if (!match) return null
  const minutes = Number(match[2]) * 60 + Number(match[3])
  if (minutes > 14 * 60) return null
  return match[1] === '-' ? -minutes : minutes
}

function applyOffset(wallClock: Date, offsetMinutes: number): Date {
  const wallClockAsUtc = Date.UTC(
    wallClock.getFullYear(),
    wallClock.getMonth(),
    wallClock.getDate(),
    wallClock.getHours(),
    wallClock.getMinutes(),
    wallClock.getSeconds(),
    wallClock.getMilliseconds(),
  )
  return new Date(wallClockAsUtc - offsetMinutes * 60_000)
}

/**
 * Resolves the capture instant from parsed EXIF tags as an ISO string, or null.
 * Parsed dates carry the naive EXIF wall clock in the local timezone, so the
 * wall-clock fields are rebuilt with OffsetTimeOriginal when it is present.
 */
export function resolveCaptureDate(tags: unknown, now: Date = new Date()): string | null {
  if (!isRecord(tags)) return null
  const original = tags.DateTimeOriginal
  if (isValidDate(original)) {
    const offset = parseOffsetMinutes(tags.OffsetTimeOriginal)
    const instant = offset === null ? original : applyOffset(original, offset)
    return sanitizeCaptureDate(instant, now)?.toISOString() ?? null
  }
  const created = tags.CreateDate
  if (isValidDate(created)) return sanitizeCaptureDate(created, now)?.toISOString() ?? null
  return null
}
