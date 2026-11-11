import { nextDayKey, parisDayKey, parisLocalInstant, previousDayKey } from './missions'

export const MOMENT_EARLIEST_MINUTE = 7 * 60
export const MOMENT_LATEST_MINUTE = 21 * 60
export const MOMENT_WINDOW_MS = 2 * 60_000
/** How long after the back-photo reservation a post keeps that instant as its capture time. */
export const MOMENT_CAPTURE_GRACE_MS = 5 * 60_000
export const MOMENT_ON_TIME_DUST = 30
export const MOMENT_LATE_DUST = 10
export const MOMENT_ON_TIME_EMBLEM_TARGET = 10
export const SELFIE_SIZES = [240, 600] as const

export type SelfieSize = (typeof SELFIE_SIZES)[number]

export interface MomentSlot {
  day: string
  firesAt: Date
  windowEndsAt: Date
}

/** 32-bit FNV-1a hash, enough to spread fire times without a crypto dependency. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (const char of input) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash
}

/** Returns the minute after Paris midnight at which a league's Moment fires on a day, in [07:00, 21:00). */
export function momentFireMinute(leagueId: string, day: string): number {
  const span = MOMENT_LATEST_MINUTE - MOMENT_EARLIEST_MINUTE
  return MOMENT_EARLIEST_MINUTE + (fnv1a(`moment:${leagueId}:${day}`) % span)
}

/** Returns the Moment of a league on a Paris day, with its 2-minute window. */
export function momentSlot(leagueId: string, day: string): MomentSlot {
  const firesAt = parisLocalInstant(day, momentFireMinute(leagueId, day))
  return { day, firesAt, windowEndsAt: new Date(firesAt.getTime() + MOMENT_WINDOW_MS) }
}

/** Returns the Moment members can post for at `now`: today's once it fired, else yesterday's (late until the next one fires). */
export function targetMoment(leagueId: string, now: Date): MomentSlot {
  const today = momentSlot(leagueId, parisDayKey(now))
  return today.firesAt.getTime() <= now.getTime()
    ? today
    : momentSlot(leagueId, previousDayKey(today.day))
}

/** Returns when a league's next Moment fires after `now`: today's if still ahead, else tomorrow's. */
export function nextMomentFiresAt(leagueId: string, now: Date): Date {
  const today = momentSlot(leagueId, parisDayKey(now))
  return today.firesAt.getTime() > now.getTime()
    ? today.firesAt
    : momentSlot(leagueId, nextDayKey(today.day)).firesAt
}

/** Tells whether the 2-minute window of a Moment is open at `now`. */
export function isMomentWindowOpen(slot: MomentSlot, now: Date): boolean {
  const time = now.getTime()
  return time >= slot.firesAt.getTime() && time < slot.windowEndsAt.getTime()
}

/** Returns whole minutes of lateness: 0 inside the window, else minutes elapsed since the fire time. */
export function momentLateMinutes(slot: MomentSlot, takenAt: Date): number {
  if (takenAt.getTime() < slot.windowEndsAt.getTime()) return 0
  return Math.floor((takenAt.getTime() - slot.firesAt.getTime()) / 60_000)
}

/** Returns the capture time of a Moment: the back-photo reservation when posted soon after it, else the post time. */
export function momentTakenAt(reservedAt: Date, postedAt: Date): Date {
  return postedAt.getTime() - reservedAt.getTime() <= MOMENT_CAPTURE_GRACE_MS
    ? reservedAt
    : postedAt
}

/** Returns the paillettes credited for posting a Moment. */
export function momentRewardDust(lateMinutes: number): number {
  return lateMinutes === 0 ? MOMENT_ON_TIME_DUST : MOMENT_LATE_DUST
}

/** Formats a lateness for the late badge: "12 min", "1 h 12", "3 h". */
export function formatMomentLateness(lateMinutes: number): string {
  if (lateMinutes < 60) return `${lateMinutes} min`
  const hours = Math.floor(lateMinutes / 60)
  const minutes = lateMinutes % 60
  return minutes === 0 ? `${hours} h` : `${hours} h ${String(minutes).padStart(2, '0')}`
}

const UUID_SOURCE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

export const SELFIE_OBJECT_KEY_PATTERN = new RegExp(
  `^pic\\/selfie\\/${UUID_SOURCE}\\/${UUID_SOURCE}\\/(${SELFIE_SIZES.join('|')})\\.webp$`,
)

/** Returns the storage prefix holding the rendered files of one selfie upload. */
export function selfiePrefix(input: { leagueId: string; uploadId: string }): string {
  return `pic/selfie/${input.leagueId}/${input.uploadId}/`
}

/** Builds the storage key of one rendered selfie size. */
export function selfieKey(input: { leagueId: string; uploadId: string; size: SelfieSize }): string {
  return `${selfiePrefix(input)}${input.size}.webp`
}

/** Returns every storage key a selfie upload owns, smallest first. */
export function storedSelfieKeys(input: { leagueId: string; uploadId: string }): string[] {
  return SELFIE_SIZES.map((size) => selfieKey({ ...input, size }))
}
