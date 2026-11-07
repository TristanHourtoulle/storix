import { describe, expect, it } from 'vitest'
import {
  BOOSTER_ELIGIBILITY_DELAY_MS,
  boosterEligibleBefore,
  isBoosterEligible,
  isTierAtLeast,
  maxTier,
  minTier,
  tierRank,
} from './cards'

describe('tier helpers', () => {
  it('returns the higher tier', () => {
    expect(maxTier('rare', 'epic')).toBe('epic')
    expect(maxTier('mythic', 'common')).toBe('mythic')
  })

  it('returns the lower tier', () => {
    expect(minTier('rare', 'epic')).toBe('rare')
    expect(minTier('legendary', 'legendary')).toBe('legendary')
  })

  it('ranks tiers from common to mythic', () => {
    expect(tierRank('common')).toBe(0)
    expect(tierRank('rare')).toBe(2)
    expect(tierRank('mythic')).toBe(5)
  })

  it('compares a tier against a minimum', () => {
    expect(isTierAtLeast('epic', 'epic')).toBe(true)
    expect(isTierAtLeast('mythic', 'epic')).toBe(true)
    expect(isTierAtLeast('rare', 'epic')).toBe(false)
  })
})

describe('booster eligibility', () => {
  const now = new Date('2026-11-07T12:00:00Z')

  it('computes the 12 hour cutoff', () => {
    expect(boosterEligibleBefore(now).toISOString()).toBe('2026-11-07T00:00:00.000Z')
    expect(BOOSTER_ELIGIBILITY_DELAY_MS).toBe(43_200_000)
  })

  it('is eligible exactly at 12 hours and not one millisecond before', () => {
    expect(isBoosterEligible(new Date('2026-11-07T00:00:00.000Z'), now)).toBe(true)
    expect(isBoosterEligible(new Date('2026-11-07T00:00:00.001Z'), now)).toBe(false)
    expect(isBoosterEligible(new Date('2026-11-06T00:00:00Z'), now)).toBe(true)
  })
})
