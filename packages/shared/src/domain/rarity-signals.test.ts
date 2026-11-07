import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RARITY_WEIGHTS,
  percentileRanks,
  photoAgeSignals,
  rarityScore,
  reactionSignals,
  scarcitySignals,
} from './rarity-signals'

describe('rarity signals', () => {
  it('ranks with mid-rank ties', () => {
    expect(percentileRanks([10, 20, 30])).toEqual([0, 0.5, 1])
    expect(percentileRanks([5, 5, 5])).toEqual([0.5, 0.5, 0.5])
    expect(percentileRanks([1, 2, 2, 3])).toEqual([0, 0.5, 0.5, 1])
    expect(percentileRanks([7])).toEqual([0.5])
    expect(percentileRanks([])).toEqual([])
  })
  it('rewards scarce uploaders', () => {
    expect(scarcitySignals(['a', 'b', 'b'])).toEqual([1, 0.25, 0.25])
  })
  it('ranks scarcity with ties, null authors and degenerate sizes', () => {
    expect(scarcitySignals([])).toEqual([])
    expect(scarcitySignals(['a'])).toEqual([0.5])
    expect(scarcitySignals(['a', 'b'])).toEqual([0.5, 0.5])
    expect(scarcitySignals([null, null, 'a'])).toEqual([0.25, 0.25, 1])
    expect(scarcitySignals(['a', 'b', 'b', 'c', 'c', 'c'])).toEqual(
      percentileRanks([-1, -2, -2, -3, -3, -3]),
    )
  })
  it('ranks photo age, caps unvalidated dates and neutralizes missing ones', () => {
    const now = new Date('2026-11-07T00:00:00Z')
    const y = (year: number) => new Date(`${year}-11-07T00:00:00Z`)
    const s = photoAgeSignals(
      [
        { capturedAt: y(2016), isValidated: true },
        { capturedAt: y(2006), isValidated: false },
        { capturedAt: null, isValidated: false },
        { capturedAt: y(2021), isValidated: true },
        { capturedAt: y(2001), isValidated: true },
      ],
      now,
    )
    expect(s[0]).toBeCloseTo(1 / 3)
    expect(s[1]).toBe(0.5)
    expect(s[2]).toBe(0.5)
    expect(s[3]).toBe(0)
    expect(s[4]).toBe(1)
  })
  it('shrinks reactions toward the league mean', () => {
    expect(
      reactionSignals([
        { reactors: 0, reactionSum: 0 },
        { reactors: 0, reactionSum: 0 },
      ]),
    ).toEqual([0.5, 0.5])
    expect(
      reactionSignals([
        { reactors: 0, reactionSum: 0 },
        { reactors: 1, reactionSum: 3 },
        { reactors: 6, reactionSum: 12 },
      ]),
    ).toEqual([0.5, 1, 0])
  })
  it('weights the score', () => {
    const signals = { uploaderScarcity: 1, photoAge: 0, reactions: 0.5 }
    expect(rarityScore(signals, DEFAULT_RARITY_WEIGHTS)).toBe(0.5)
    expect(rarityScore(signals, { uploaderScarcity: 2, photoAge: 1, reactions: 1 })).toBe(0.625)
    expect(rarityScore(signals, { uploaderScarcity: 0, photoAge: 0, reactions: 0 })).toBe(0.5)
  })
})
