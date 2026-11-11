import { describe, expect, it } from 'vitest'
import {
  formatMomentLateness,
  isMomentWindowOpen,
  momentLateMinutes,
  momentRewardDust,
  momentSlot,
  momentTakenAt,
  targetMoment,
} from './moments'

const LEAGUE = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b'

function parisHourMinute(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  return get('hour') * 60 + get('minute')
}

describe('momentSlot', () => {
  it('should fire between 07:00 and 21:00 Paris on every day, summer and winter', () => {
    const days = ['2026-01-15', '2026-03-29', '2026-07-01', '2026-10-25', '2026-11-11']
    for (const day of days) {
      for (let index = 0; index < 50; index += 1) {
        const minute = parisHourMinute(momentSlot(`${LEAGUE}-${index}`, day).firesAt)
        expect(minute).toBeGreaterThanOrEqual(7 * 60)
        expect(minute).toBeLessThan(21 * 60)
      }
    }
  })

  it('should be stable for a league and day and differ across days', () => {
    const a = momentSlot(LEAGUE, '2026-11-11').firesAt.getTime()
    expect(momentSlot(LEAGUE, '2026-11-11').firesAt.getTime()).toBe(a)
    const others = ['2026-11-12', '2026-11-13', '2026-11-14'].map((day) =>
      parisHourMinute(momentSlot(LEAGUE, day).firesAt),
    )
    expect(new Set([parisHourMinute(new Date(a)), ...others]).size).toBeGreaterThan(1)
  })
})

describe('targetMoment', () => {
  it("should target yesterday's Moment before today's fires and today's after", () => {
    const today = momentSlot(LEAGUE, '2026-11-11')
    const before = new Date(today.firesAt.getTime() - 1)
    expect(targetMoment(LEAGUE, before).day).toBe('2026-11-10')
    expect(targetMoment(LEAGUE, today.firesAt).day).toBe('2026-11-11')
  })
})

describe('lateness and rewards', () => {
  const slot = momentSlot(LEAGUE, '2026-11-11')
  const at = (ms: number) => new Date(slot.firesAt.getTime() + ms)

  it('should count the 2-minute window as on time', () => {
    expect(isMomentWindowOpen(slot, at(0))).toBe(true)
    expect(isMomentWindowOpen(slot, at(119_999))).toBe(true)
    expect(isMomentWindowOpen(slot, at(120_000))).toBe(false)
    expect(momentLateMinutes(slot, at(119_999))).toBe(0)
    expect(momentRewardDust(0)).toBe(30)
  })

  it('should measure lateness from the fire time once the window closed', () => {
    expect(momentLateMinutes(slot, at(120_000))).toBe(2)
    expect(momentLateMinutes(slot, at(72 * 60_000 + 30_000))).toBe(72)
    expect(momentRewardDust(72)).toBe(10)
  })

  it('should format lateness for the badge', () => {
    expect(formatMomentLateness(5)).toBe('5 min')
    expect(formatMomentLateness(72)).toBe('1 h 12')
    expect(formatMomentLateness(180)).toBe('3 h')
    expect(formatMomentLateness(61)).toBe('1 h 01')
  })
})

describe('momentTakenAt', () => {
  const reservedAt = new Date('2026-11-11T10:00:00Z')

  it('keeps the reservation instant when posted within five minutes', () => {
    expect(momentTakenAt(reservedAt, new Date('2026-11-11T10:05:00Z'))).toEqual(reservedAt)
  })

  it('falls back to the post time when the upload took longer', () => {
    const postedAt = new Date('2026-11-11T10:05:01Z')
    expect(momentTakenAt(reservedAt, postedAt)).toEqual(postedAt)
  })
})
