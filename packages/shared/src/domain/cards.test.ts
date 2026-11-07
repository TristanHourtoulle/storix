import { describe, expect, it } from 'vitest'
import {
  DEFAULT_NEW_CARD_DELAY_MINUTES,
  boosterEligibleAt,
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

  it('defaults to a 12 hour delay', () => {
    expect(DEFAULT_NEW_CARD_DELAY_MINUTES).toBe(720)
  })

  it('applies the league new-card delay', () => {
    expect(boosterEligibleBefore(now, 720)).toEqual(new Date('2026-11-07T00:00:00Z'))
    expect(isBoosterEligible(new Date('2026-11-07T00:00:00Z'), now, 720)).toBe(true)
    expect(isBoosterEligible(new Date('2026-11-07T00:00:01Z'), now, 720)).toBe(false)
    expect(isBoosterEligible(now, now, 0)).toBe(true)
    expect(boosterEligibleAt(now, 60)).toEqual(new Date('2026-11-07T13:00:00Z'))
  })

  it('is eligible exactly at the delay and not one millisecond before', () => {
    expect(isBoosterEligible(new Date('2026-11-07T00:00:00.000Z'), now, 720)).toBe(true)
    expect(isBoosterEligible(new Date('2026-11-07T00:00:00.001Z'), now, 720)).toBe(false)
    expect(isBoosterEligible(new Date('2026-11-06T00:00:00Z'), now, 720)).toBe(true)
  })
})
