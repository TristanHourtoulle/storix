import { describe, expect, it } from 'vitest'
import { isEpicGuaranteed, legendaryBonusPercent, nextPityState, pitySummary } from './pity'

describe('pity', () => {
  it('guarantees an epic on the 10th dry booster', () => {
    expect(isEpicGuaranteed({ sinceEpic: 8, sinceLegendary: 0 })).toBe(false)
    expect(isEpicGuaranteed({ sinceEpic: 9, sinceLegendary: 0 })).toBe(true)
  })
  it('adds 1% legendary per booster after 25 without', () => {
    expect(legendaryBonusPercent({ sinceEpic: 0, sinceLegendary: 24 })).toBe(0)
    expect(legendaryBonusPercent({ sinceEpic: 0, sinceLegendary: 25 })).toBe(1)
    expect(legendaryBonusPercent({ sinceEpic: 0, sinceLegendary: 30 })).toBe(6)
  })
  it('summarizes pity for the home screen', () => {
    expect(pitySummary({ sinceEpic: 0, sinceLegendary: 0 })).toEqual({
      epicGuaranteeIn: 10,
      epicProgress: 0,
      legendaryBonusPercent: 0,
    })
    expect(pitySummary({ sinceEpic: 9, sinceLegendary: 26 })).toEqual({
      epicGuaranteeIn: 1,
      epicProgress: 0.9,
      legendaryBonusPercent: 2,
    })
  })
  it('advances or resets counters from minted tiers', () => {
    const p = { sinceEpic: 3, sinceLegendary: 30 }
    expect(nextPityState(p, ['common', 'rare', 'epic'])).toEqual({
      sinceEpic: 0,
      sinceLegendary: 31,
    })
    expect(nextPityState(p, ['legendary'])).toEqual({ sinceEpic: 0, sinceLegendary: 0 })
    expect(nextPityState(p, ['mythic'])).toEqual({ sinceEpic: 0, sinceLegendary: 0 })
    expect(nextPityState(p, ['rare'])).toEqual({ sinceEpic: 4, sinceLegendary: 31 })
  })
})
