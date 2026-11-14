import { parisDayKey, parisLocalInstant } from './missions'
import { acceptsCards, type SeriesIcon, type SeriesKind, type SeriesWindow } from './series'

export const EVENT_ICONS = [
  'party',
  'dinner',
  'cake',
  'mountain',
  'sun',
  'tree',
  'ball',
  'music',
  'glass',
  'heart',
  'moon',
  'camera',
] as const satisfies readonly SeriesIcon[]

export type EventIcon = (typeof EVENT_ICONS)[number]

export const DEFAULT_EVENT_ICON: EventIcon = 'party'
export const EVENT_MIN_MINUTES = 30
export const EVENT_MAX_HOURS = 48
export const EVENT_MAX_LEAD_DAYS = 30
export const EVENT_START_SLACK_MINUTES = 5
export const EVENT_GRACE_HOURS = 12
export const EVENT_MAX_ACTIVE = 3
export const EVENT_CREATIONS_PER_DAY = 3

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const STEP_MINUTES = 5

export type EventWindowCheck = 'ok' | 'too_short' | 'too_long' | 'in_past' | 'too_far'

export interface EventWindow {
  startsAt: Date
  endsAt: Date
}

/** Checks an event window: 30 min to 48 h long, starting from a few minutes ago up to 30 days ahead. */
export function validateEventWindow(input: EventWindow & { now: Date }): EventWindowCheck {
  const { startsAt, endsAt, now } = input
  const length = endsAt.getTime() - startsAt.getTime()
  if (startsAt.getTime() < now.getTime() - EVENT_START_SLACK_MINUTES * MINUTE_MS) return 'in_past'
  if (startsAt.getTime() > now.getTime() + EVENT_MAX_LEAD_DAYS * DAY_MS) return 'too_far'
  if (length < EVENT_MIN_MINUTES * MINUTE_MS) return 'too_short'
  if (length > EVENT_MAX_HOURS * HOUR_MS) return 'too_long'
  return 'ok'
}

/** Returns the end of the 12 h window, after an event, during which its photos can still be sent. */
export function eventGraceEndsAt(endsAt: Date): Date {
  return new Date(endsAt.getTime() + EVENT_GRACE_HOURS * HOUR_MS)
}

/** Returns when a photo was taken: the media date, else the date the phone gave, else the upload time. */
export function captureInstant(input: {
  mediaCapturedAt: Date | null
  clientCapturedAt: Date | null
  uploadedAt: Date
}): Date {
  return input.mediaCapturedAt ?? input.clientCapturedAt ?? input.uploadedAt
}

export interface PhotoTiming {
  capturedAt: Date
  sentAt: Date
}

/** Tells whether a series takes a photo: open when it was sent, and for an event, taken during it. */
export function acceptsPhoto(
  series: SeriesWindow & { kind: SeriesKind },
  photo: PhotoTiming,
): boolean {
  if (!acceptsCards(series, photo.sentAt)) return false
  if (series.kind === 'theme') return true
  return photo.capturedAt >= series.startsAt && photo.capturedAt < series.endsAt
}

/** Returns the ids of the events whose window contains the capture time, to switch them on by default. */
export function precheckedEventIds(
  events: readonly (EventWindow & { id: string; kind: SeriesKind })[],
  capturedAt: Date,
): string[] {
  return events
    .filter((event) => event.kind === 'event')
    .filter((event) => capturedAt >= event.startsAt && capturedAt < event.endsAt)
    .map((event) => event.id)
}

const PARIS_CLOCK = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const WEEKDAYS: Readonly<Record<string, number>> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
}

function parisClock(date: Date): { weekday: number; minutes: number } {
  const parts = Object.fromEntries(
    PARIS_CLOCK.formatToParts(date).map((part) => [part.type, part.value]),
  )
  const weekday = parts.weekday === undefined ? undefined : WEEKDAYS[parts.weekday]
  if (weekday === undefined) throw new Error(`Unexpected Paris weekday: ${String(parts.weekday)}`)
  return { weekday, minutes: Number(parts.hour) * 60 + Number(parts.minute) }
}

function shiftDayKey(key: string, days: number): string {
  const [year = 0, month = 1, day = 1] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS).toISOString().slice(0, 10)
}

function roundUpToStep(date: Date): Date {
  const step = STEP_MINUTES * MINUTE_MS
  return new Date(Math.ceil(date.getTime() / step) * step)
}

function at(key: string, hour: number): Date {
  return parisLocalInstant(key, hour * 60)
}

export interface EventShortcuts {
  tonight: EventWindow
  tomorrowNoon: EventWindow
  weekend: EventWindow
}

/** Computes the « Ce soir », « Demain midi » and « Ce week-end » windows in Paris time. */
export function eventShortcuts(now: Date): EventShortcuts {
  const today = parisDayKey(now)
  const { weekday, minutes } = parisClock(now)
  const startNow = roundUpToStep(now)
  const isAfterMidnight = minutes < 2 * 60
  const tonightStart = at(today, 20)
  const tonight = isAfterMidnight
    ? {
        startsAt: startNow,
        endsAt: new Date(
          Math.max(at(today, 2).getTime(), startNow.getTime() + EVENT_MIN_MINUTES * MINUTE_MS),
        ),
      }
    : {
        startsAt: now < tonightStart ? tonightStart : startNow,
        endsAt: at(shiftDayKey(today, 1), 2),
      }
  const tomorrow = shiftDayKey(today, 1)
  const tomorrowNoon = { startsAt: at(tomorrow, 12), endsAt: at(tomorrow, 16) }
  return { tonight, tomorrowNoon, weekend: weekendOf(now, today, weekday, minutes, startNow) }
}

function weekendOf(
  now: Date,
  today: string,
  weekday: number,
  minutes: number,
  startNow: Date,
): EventWindow {
  if (weekday === 6) {
    const start = at(today, 10)
    return { startsAt: now < start ? start : startNow, endsAt: at(shiftDayKey(today, 1), 20) }
  }
  if (weekday === 7) {
    const end = at(today, 20)
    if (end.getTime() - startNow.getTime() >= EVENT_MIN_MINUTES * MINUTE_MS && minutes < 20 * 60) {
      return { startsAt: startNow, endsAt: end }
    }
  }
  const saturday = shiftDayKey(today, (6 - weekday + 7) % 7 || 7)
  return { startsAt: at(saturday, 10), endsAt: at(shiftDayKey(saturday, 1), 20) }
}

/** Converts a `YYYY-MM-DDTHH:mm` value typed in Paris time into an instant. */
export function parisInstantFromLocal(value: string): Date | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (match === null) return null
  const [, key = '', hours = '0', mins = '0'] = match
  return parisLocalInstant(key, Number(hours) * 60 + Number(mins))
}

/** Formats an instant as a `YYYY-MM-DDTHH:mm` value in Paris time, for a `datetime-local` input. */
export function toParisLocalInput(date: Date): string {
  const { minutes } = parisClock(date)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${parisDayKey(date)}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}
