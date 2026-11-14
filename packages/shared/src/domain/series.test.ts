import { describe, expect, it } from 'vitest'
import {
  acceptsCards,
  daysLeft,
  isRewardEligible,
  mostActive,
  nextThemeWeekKey,
  rotationThemeFor,
  seriesPhase,
  THEME_ROTATION,
  themeWeekBounds,
  themeWeekKey,
} from './series'

describe('themeWeekKey', () => {
  it('should start the week on Monday 00:00 Paris time', () => {
    expect(themeWeekKey(new Date('2026-11-15T22:59:00Z'))).toBe('2026-11-09')
    expect(themeWeekKey(new Date('2026-11-15T23:00:00Z'))).toBe('2026-11-16')
  })

  it('should keep Monday 00:00 Paris across the summer time change', () => {
    expect(themeWeekKey(new Date('2026-03-29T21:59:00Z'))).toBe('2026-03-23')
    expect(themeWeekKey(new Date('2026-03-29T22:00:00Z'))).toBe('2026-03-30')
  })
})

describe('themeWeekBounds', () => {
  it('should cover seven days from Monday midnight to the next Monday midnight in Paris', () => {
    expect(themeWeekBounds('2026-11-09')).toEqual({
      start: new Date('2026-11-08T23:00:00Z'),
      end: new Date('2026-11-15T23:00:00Z'),
    })
  })

  it('should end one hour earlier in UTC when summer time starts during the week', () => {
    const { start, end } = themeWeekBounds('2026-03-23')
    expect(start).toEqual(new Date('2026-03-22T23:00:00Z'))
    expect(end).toEqual(new Date('2026-03-29T22:00:00Z'))
  })
})

describe('rotationThemeFor', () => {
  it('should not repeat a theme before the whole list is used', () => {
    const titles = Array.from({ length: THEME_ROTATION.length }).reduce<{
      key: string
      seen: string[]
    }>(
      (acc) => ({
        key: nextThemeWeekKey(acc.key),
        seen: [...acc.seen, rotationThemeFor('league-a', acc.key).title],
      }),
      { key: '2024-01-01', seen: [] },
    ).seen
    expect(new Set(titles).size).toBe(THEME_ROTATION.length)
  })

  it('should give two leagues different orders', () => {
    const order = (leagueId: string) =>
      ['2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'].map(
        (key) => rotationThemeFor(leagueId, key).title,
      )
    expect(order('league-a')).not.toEqual(order('league-b'))
  })

  it('should be deterministic for a league and a week', () => {
    expect(rotationThemeFor('league-a', '2026-11-09')).toEqual(
      rotationThemeFor('league-a', '2026-11-09'),
    )
  })
})

describe('series phases', () => {
  const window = {
    startsAt: new Date('2026-11-08T23:00:00Z'),
    endsAt: new Date('2026-11-15T23:00:00Z'),
    graceEndsAt: new Date('2026-11-16T11:00:00Z'),
    closedAt: null,
  }

  it('should accept cards while live and during the grace window only', () => {
    expect(acceptsCards(window, new Date('2026-11-08T22:59:00Z'))).toBe(false)
    expect(seriesPhase(window, new Date('2026-11-10T12:00:00Z'))).toBe('live')
    expect(seriesPhase(window, new Date('2026-11-16T01:00:00Z'))).toBe('grace')
    expect(acceptsCards(window, new Date('2026-11-16T01:00:00Z'))).toBe(true)
    expect(acceptsCards(window, new Date('2026-11-16T11:00:00Z'))).toBe(false)
  })

  it('should be closed once closed early', () => {
    const closed = { ...window, closedAt: new Date('2026-11-10T00:00:00Z') }
    expect(seriesPhase(closed, new Date('2026-11-10T12:00:00Z'))).toBe('closed')
  })
})

describe('isRewardEligible', () => {
  it('should pay only closed series of at least five cards', () => {
    expect(isRewardEligible({ isClosed: true, cardCount: 5 })).toBe(true)
    expect(isRewardEligible({ isClosed: true, cardCount: 4 })).toBe(false)
    expect(isRewardEligible({ isClosed: false, cardCount: 12 })).toBe(false)
  })
})

describe('daysLeft', () => {
  const end = new Date('2026-11-15T23:00:00Z')

  it('should count J-3 on Thursday and 0 on Sunday', () => {
    expect(daysLeft(end, new Date('2026-11-12T10:00:00Z'))).toBe(3)
    expect(daysLeft(end, new Date('2026-11-15T20:00:00Z'))).toBe(0)
  })
})

describe('mostActive', () => {
  it('should pick the most cards, then the earliest first card', () => {
    expect(
      mostActive([
        { userId: 'a', cards: 3, firstAt: new Date('2026-11-10T10:00:00Z') },
        { userId: 'b', cards: 3, firstAt: new Date('2026-11-09T10:00:00Z') },
        { userId: 'c', cards: 1, firstAt: new Date('2026-11-09T09:00:00Z') },
      ]),
    ).toBe('b')
    expect(mostActive([])).toBeNull()
  })
})
