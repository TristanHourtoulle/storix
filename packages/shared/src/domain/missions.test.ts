import { describe, expect, it } from 'vitest'
import {
  DAILY_BOOSTER_MISSION_IDS,
  missionDayKey,
  missionWeekKey,
  periodBounds,
  selectDailyMissions,
  selectWeeklyMissions,
} from './missions'

const SEED = '0123456789abcdef0123456789abcdef'

describe('missions', () => {
  it('draws 3 deterministic daily missions with a booster mission first and avoids yesterday', () => {
    const first = selectDailyMissions(SEED, [])
    expect(selectDailyMissions(SEED, []).map((m) => m.id)).toEqual(first.map((m) => m.id))
    expect(first).toHaveLength(3)
    expect(DAILY_BOOSTER_MISSION_IDS).toContain(first[0]?.id)
    const yesterday = first.slice(1).map((m) => m.id)
    const next = selectDailyMissions(SEED, yesterday)
    expect(next.slice(1).some((m) => yesterday.includes(m.id))).toBe(false)
  })

  it('draws 4 distinct weekly missions', () => {
    const ids = selectWeeklyMissions(SEED).map((m) => m.id)
    expect(new Set(ids).size).toBe(4)
  })

  it('cuts days at 05:00 Paris across DST and weeks on Monday', () => {
    expect(missionDayKey(new Date('2026-11-10T03:59:00Z'))).toBe('2026-11-09')
    expect(missionDayKey(new Date('2026-11-10T04:00:00Z'))).toBe('2026-11-10')
    expect(missionDayKey(new Date('2026-07-01T03:00:00Z'))).toBe('2026-07-01')
    expect(missionWeekKey(new Date('2026-11-10T12:00:00Z'))).toBe('2026-11-09')
    expect(missionWeekKey(new Date('2026-11-09T03:30:00Z'))).toBe('2026-11-02')
    expect(periodBounds('day', '2026-10-25').start.toISOString()).toBe('2026-10-25T04:00:00.000Z')
    expect(periodBounds('week', '2026-10-19')).toEqual({
      start: new Date('2026-10-19T03:00:00.000Z'),
      end: new Date('2026-10-26T04:00:00.000Z'),
    })
  })
})
