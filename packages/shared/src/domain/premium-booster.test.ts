import { describe, expect, it } from 'vitest'
import { isPremiumBooster, premiumSummary } from './premium-booster'

describe('premium booster', () => {
  it('makes every 20th opening premium', () => {
    expect([19, 39].map(isPremiumBooster)).toEqual([true, true])
    expect([0, 18, 20].map(isPremiumBooster)).toEqual([false, false, false])
  })

  it('counts the boosters left until the next premium one', () => {
    expect(premiumSummary(19).boostersUntil).toBe(1)
    expect(premiumSummary(20).boostersUntil).toBe(20)
  })
})
