import { describe, expect, it } from 'vitest'
import { bonusTarget, goalTarget, nextGoalFactor } from './league-goal'

describe('league goal', () => {
  it('scales the target with active members as in the design table', () => {
    expect([5, 12, 30].map((n) => goalTarget('photos', n, 1))).toEqual([20, 48, 120])
    expect([5, 12, 30].map((n) => goalTarget('boosters', n, 1))).toEqual([60, 144, 360])
    expect(bonusTarget(48)).toBe(72)
  })

  it('smooths the factor and clamps it between 0.7 and 1.5', () => {
    expect(nextGoalFactor({ factor: 1, status: 'reached', reachedWithinDays: 3 })).toBe(1.1)
    expect(nextGoalFactor({ factor: 1, status: 'reached', reachedWithinDays: 6 })).toBe(1)
    expect(nextGoalFactor({ factor: 0.72, status: 'missed', reachedWithinDays: null })).toBe(0.7)
    expect(nextGoalFactor({ factor: 1.45, status: 'bonus', reachedWithinDays: 1 })).toBe(1.5)
  })
})
