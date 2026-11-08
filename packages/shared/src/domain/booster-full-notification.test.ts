import { describe, expect, it } from 'vitest'
import {
  boosterFullNotificationBody,
  computeBoosterFullAt,
  isBoosterFullNotificationDue,
  shouldRearmBoosterFullNotifications,
} from './booster-full-notification'
import {
  computeBoosterStock,
  DEFAULT_BOOSTER_CADENCE,
  InvalidBoosterCadenceError,
} from './booster-stock'

const t0 = new Date('2026-11-07T00:00:00Z')
const at = (minutes: number) => new Date(t0.getTime() + minutes * 60_000)
const cadence = DEFAULT_BOOSTER_CADENCE

describe('booster-full notification', () => {
  it('returns anchor + missing boosters * interval', () => {
    expect(computeBoosterFullAt({ stock: 2, anchor: t0 }, cadence)).toEqual(at(4 * 240))
    expect(
      computeBoosterFullAt({ stock: 0, anchor: t0 }, { intervalMinutes: 1, maxStock: 1 }),
    ).toEqual(at(1))
  })

  it('returns the anchor when the stored stock is already full', () => {
    expect(computeBoosterFullAt({ stock: 6, anchor: t0 }, cadence)).toEqual(t0)
  })

  it('returns the anchor when the stored stock already exceeds the max', () => {
    expect(computeBoosterFullAt({ stock: 9, anchor: t0 }, cadence)).toEqual(t0)
  })

  it('agrees with computeBoosterStock on the fill instant', () => {
    const state = { stock: 1, anchor: t0 }
    const fullAt = computeBoosterFullAt(state, cadence)
    expect(computeBoosterStock(state, new Date(fullAt.getTime() - 1), cadence).available).toBe(5)
    expect(computeBoosterStock(state, fullAt, cadence).available).toBe(6)
  })

  it('rejects an invalid cadence', () => {
    expect(() =>
      computeBoosterFullAt({ stock: 0, anchor: t0 }, { intervalMinutes: 0, maxStock: 6 }),
    ).toThrow(InvalidBoosterCadenceError)
  })

  it('is due only when armed and the fill instant has passed', () => {
    expect(isBoosterFullNotificationDue({ fullAt: at(10), now: at(9), notifiedAt: null })).toBe(
      false,
    )
    expect(isBoosterFullNotificationDue({ fullAt: at(10), now: at(10), notifiedAt: null })).toBe(
      true,
    )
    expect(isBoosterFullNotificationDue({ fullAt: at(10), now: at(500), notifiedAt: at(11) })).toBe(
      false,
    )
  })

  it('re-arms only when the max stock increases', () => {
    expect(shouldRearmBoosterFullNotifications({ maxStock: 6 }, { maxStock: 8 })).toBe(true)
    expect(shouldRearmBoosterFullNotifications({ maxStock: 6 }, { maxStock: 6 })).toBe(false)
    expect(shouldRearmBoosterFullNotifications({ maxStock: 6 }, { maxStock: 4 })).toBe(false)
  })

  it('formats the body in French with the singular for one booster', () => {
    expect(boosterFullNotificationBody('Les potes', 6)).toBe("Les potes : 6 boosters t'attendent")
    expect(boosterFullNotificationBody('Ski 2027', 1)).toBe("Ski 2027 : 1 booster t'attend")
  })
})
