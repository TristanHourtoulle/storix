import { describe, expect, it } from 'vitest'
import { computeBoosterStock, consumeBooster, DEFAULT_BOOSTER_CADENCE } from './booster-stock'

const t0 = new Date('2026-11-07T00:00:00Z')
const at = (minutes: number) => new Date(t0.getTime() + minutes * 60_000)
const cadence = DEFAULT_BOOSTER_CADENCE

describe('booster stock', () => {
  it('refills one booster per interval', () => {
    expect(computeBoosterStock({ stock: 0, anchor: t0 }, at(239), cadence)).toEqual({
      available: 0,
      anchor: t0,
      nextAt: at(240),
    })
    expect(computeBoosterStock({ stock: 0, anchor: t0 }, at(240), cadence)).toEqual({
      available: 1,
      anchor: at(240),
      nextAt: at(480),
    })
    expect(computeBoosterStock({ stock: 0, anchor: t0 }, at(540), cadence)).toEqual({
      available: 2,
      anchor: at(480),
      nextAt: at(720),
    })
  })
  it('caps at the max stock and stops the timer', () =>
    expect(computeBoosterStock({ stock: 5, anchor: t0 }, at(6000), cadence)).toEqual({
      available: 6,
      anchor: at(6000),
      nextAt: null,
    }))
  it('keeps a stock above the max', () =>
    expect(computeBoosterStock({ stock: 8, anchor: t0 }, at(10), cadence).available).toBe(8))
  it('ignores a clock earlier than the anchor', () =>
    expect(computeBoosterStock({ stock: 1, anchor: at(60) }, t0, cadence)).toEqual({
      available: 1,
      anchor: at(60),
      nextAt: at(300),
    }))
  it('consumes and starts the timer when leaving the max', () => {
    expect(consumeBooster({ stock: 6, anchor: t0 }, at(30), cadence)).toEqual({
      stock: 5,
      anchor: at(30),
    })
    expect(consumeBooster({ stock: 2, anchor: t0 }, at(60), cadence)).toEqual({
      stock: 1,
      anchor: t0,
    })
    expect(consumeBooster({ stock: 0, anchor: t0 }, at(60), cadence)).toBeNull()
  })
})
