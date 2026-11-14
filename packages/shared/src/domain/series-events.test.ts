import { describe, expect, it } from 'vitest'
import {
  acceptsPhoto,
  eventShortcuts,
  parisInstantFromLocal,
  precheckedEventIds,
  toParisLocalInput,
  validateEventWindow,
} from './series-events'

const MIN = 60_000
const now = new Date('2026-11-14T10:00:00Z')
const after = (minutes: number): Date => new Date(now.getTime() + minutes * MIN)

describe('validateEventWindow', () => {
  it('should accept 30 min to 48 h windows', () => {
    expect(validateEventWindow({ startsAt: after(60), endsAt: after(89), now })).toBe('too_short')
    expect(validateEventWindow({ startsAt: after(60), endsAt: after(90), now })).toBe('ok')
    expect(validateEventWindow({ startsAt: after(60), endsAt: after(60 + 48 * 60), now })).toBe(
      'ok',
    )
    expect(validateEventWindow({ startsAt: after(60), endsAt: after(61 + 48 * 60), now })).toBe(
      'too_long',
    )
  })

  it('should allow a start a few minutes ago but not further back nor beyond 30 days', () => {
    expect(validateEventWindow({ startsAt: after(-5), endsAt: after(60), now })).toBe('ok')
    expect(validateEventWindow({ startsAt: after(-6), endsAt: after(60), now })).toBe('in_past')
    const far = after(30 * 24 * 60 + 1)
    expect(validateEventWindow({ startsAt: far, endsAt: after(31 * 24 * 60), now })).toBe('too_far')
  })
})

describe('acceptsPhoto', () => {
  const window = {
    startsAt: new Date('2026-11-15T11:00:00Z'),
    endsAt: new Date('2026-11-15T15:00:00Z'),
    graceEndsAt: new Date('2026-11-16T03:00:00Z'),
    closedAt: null,
  }
  const event = { ...window, kind: 'event' as const }
  const sent = new Date('2026-11-15T20:00:00Z')

  it('should ignore the capture time for a theme', () => {
    const theme = { ...window, kind: 'theme' as const }
    expect(
      acceptsPhoto(theme, { capturedAt: new Date('2026-11-01T00:00:00Z'), sentAt: sent }),
    ).toBe(true)
  })

  it('should keep event photos taken during the event and sent before the grace end', () => {
    expect(
      acceptsPhoto(event, { capturedAt: new Date('2026-11-15T10:40:00Z'), sentAt: sent }),
    ).toBe(false)
    expect(
      acceptsPhoto(event, { capturedAt: new Date('2026-11-15T14:50:00Z'), sentAt: sent }),
    ).toBe(true)
    expect(
      acceptsPhoto(event, {
        capturedAt: new Date('2026-11-15T14:50:00Z'),
        sentAt: new Date('2026-11-16T04:00:00Z'),
      }),
    ).toBe(false)
  })

  it('should precheck every overlapping event containing the capture', () => {
    const other = { ...event, id: 'b', startsAt: new Date('2026-11-15T14:00:00Z') }
    const ids = precheckedEventIds([{ ...event, id: 'a' }, other], new Date('2026-11-15T14:30:00Z'))
    expect(ids).toEqual(['a', 'b'])
    expect(precheckedEventIds([{ ...event, id: 'a' }], new Date('2026-11-15T16:00:00Z'))).toEqual(
      [],
    )
  })
})

describe('eventShortcuts', () => {
  it('should plan tonight, tomorrow noon and the next weekend in Paris time', () => {
    const { tonight, tomorrowNoon, weekend } = eventShortcuts(new Date('2026-11-12T09:00:00Z'))
    expect(tonight.startsAt.toISOString()).toBe('2026-11-12T19:00:00.000Z')
    expect(tonight.endsAt.toISOString()).toBe('2026-11-13T01:00:00.000Z')
    expect(tomorrowNoon.startsAt.toISOString()).toBe('2026-11-13T11:00:00.000Z')
    expect(weekend.startsAt.toISOString()).toBe('2026-11-14T09:00:00.000Z')
    expect(weekend.endsAt.toISOString()).toBe('2026-11-15T19:00:00.000Z')
  })

  it('should cross the October DST change on the right hour', () => {
    const { weekend } = eventShortcuts(new Date('2026-10-22T09:00:00Z'))
    expect(weekend.startsAt.toISOString()).toBe('2026-10-24T08:00:00.000Z')
    expect(weekend.endsAt.toISOString()).toBe('2026-10-25T19:00:00.000Z')
  })

  it('should start now on a Sunday afternoon and move to next weekend late on Sunday', () => {
    const sunday = eventShortcuts(new Date('2026-11-15T14:02:00Z')).weekend
    expect(sunday.startsAt.toISOString()).toBe('2026-11-15T14:05:00.000Z')
    expect(sunday.endsAt.toISOString()).toBe('2026-11-15T19:00:00.000Z')
    const late = eventShortcuts(new Date('2026-11-15T18:45:00Z')).weekend
    expect(late.startsAt.toISOString()).toBe('2026-11-21T09:00:00.000Z')
  })
})

describe('Paris local inputs', () => {
  it('should round-trip a datetime-local value', () => {
    const instant = parisInstantFromLocal('2026-11-14T20:30')
    expect(instant?.toISOString()).toBe('2026-11-14T19:30:00.000Z')
    expect(toParisLocalInput(new Date('2026-11-14T19:30:00Z'))).toBe('2026-11-14T20:30')
    expect(parisInstantFromLocal('nope')).toBeNull()
  })
})
