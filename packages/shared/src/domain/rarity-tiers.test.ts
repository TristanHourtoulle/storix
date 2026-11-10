import { describe, expect, it } from 'vitest'
import {
  applyHysteresis,
  capColdStartTier,
  COLD_START_LOWER_BOUNDS,
  mythicQuota,
  positionPercentiles,
  QUOTA_LOWER_BOUNDS,
  resolveEffectiveTier,
  selectComputedMythics,
  tierForValue,
} from './rarity-tiers'

describe('rarity tiers', () => {
  it('maps values to tiers', () => {
    expect(tierForValue(0.449, QUOTA_LOWER_BOUNDS)).toBe('common')
    expect(tierForValue(0.45, QUOTA_LOWER_BOUNDS)).toBe('uncommon')
    expect(tierForValue(0.95, QUOTA_LOWER_BOUNDS)).toBe('legendary')
    expect(tierForValue(0.88, COLD_START_LOWER_BOUNDS)).toBe('legendary')
  })
  it('centers positions', () => {
    const p = positionPercentiles([0.3, 0.1, 0.2])
    expect(p[0]).toBeCloseTo(5 / 6)
    expect(p[1]).toBeCloseTo(1 / 6)
    expect(p[2]).toBeCloseTo(0.5)
    expect(positionPercentiles([1, 1])).toEqual([0.5, 0.5])
  })
  it('needs 2 points past a boundary to move', () => {
    const b = QUOTA_LOWER_BOUNDS
    expect(applyHysteresis({ value: 0.46, previous: 'common', bounds: b })).toBe('common')
    expect(applyHysteresis({ value: 0.48, previous: 'common', bounds: b })).toBe('uncommon')
    expect(applyHysteresis({ value: 0.44, previous: 'uncommon', bounds: b })).toBe('uncommon')
    expect(applyHysteresis({ value: 0.42, previous: 'uncommon', bounds: b })).toBe('common')
    expect(applyHysteresis({ value: 0.99, previous: 'common', bounds: b })).toBe('legendary')
    expect(applyHysteresis({ value: 0.46, previous: null, bounds: b })).toBe('uncommon')
  })
  it('moves at exactly the margin and stays within it, in both directions', () => {
    const b = QUOTA_LOWER_BOUNDS
    expect(applyHysteresis({ value: 0.47, previous: 'common', bounds: b })).toBe('uncommon')
    expect(applyHysteresis({ value: 0.469, previous: 'common', bounds: b })).toBe('common')
    expect(applyHysteresis({ value: 0.43, previous: 'uncommon', bounds: b })).toBe('common')
    expect(applyHysteresis({ value: 0.431, previous: 'uncommon', bounds: b })).toBe('uncommon')
    expect(applyHysteresis({ value: 0.72, previous: 'uncommon', bounds: b })).toBe('rare')
    expect(applyHysteresis({ value: 0.68, previous: 'rare', bounds: b })).toBe('uncommon')
    expect(applyHysteresis({ value: 0.87, previous: 'rare', bounds: b })).toBe('epic')
    expect(applyHysteresis({ value: 0.83, previous: 'epic', bounds: b })).toBe('rare')
  })
  it('caps cold start legendaries and applies precedence', () => {
    expect(capColdStartTier('legendary', 14)).toBe('epic')
    expect(capColdStartTier('legendary', 15)).toBe('legendary')
    expect(
      resolveEffectiveTier({ computed: 'common', pinned: 'mythic', min: null, max: null }),
    ).toEqual({
      tier: 'mythic',
      source: 'pinned',
    })
    expect(
      resolveEffectiveTier({ computed: 'legendary', pinned: null, min: null, max: 'uncommon' }),
    ).toEqual({ tier: 'uncommon', source: 'bounded' })
    expect(
      resolveEffectiveTier({ computed: 'common', pinned: null, min: 'rare', max: null }),
    ).toEqual({
      tier: 'rare',
      source: 'bounded',
    })
    expect(
      resolveEffectiveTier({ computed: 'rare', pinned: null, min: 'epic', max: 'uncommon' }),
    ).toEqual({
      tier: 'uncommon',
      source: 'bounded',
    })
    expect(
      resolveEffectiveTier({ computed: 'rare', pinned: null, min: 'common', max: 'epic' }),
    ).toEqual({
      tier: 'rare',
      source: 'computed',
    })
  })
  it('grants one mythic from 50 cards, then one per 100', () => {
    expect([49, 50, 199, 200].map(mythicQuota)).toEqual([0, 1, 1, 2])
  })
  it('keeps a previous mythic still in the legendary band and skips ineligible cards', () => {
    const card = (cardId: string, score: number, extra = {}) => ({
      cardId,
      number: 0,
      score,
      percentile: 0.97,
      isEligible: true,
      wasMythic: false,
      ...extra,
    })
    const candidates = [
      card('pinned', 0.99, { isEligible: false }),
      card('newcomer', 0.9),
      card('incumbent', 0.89, { wasMythic: true }),
    ]
    expect([...selectComputedMythics(candidates, 1)]).toEqual(['incumbent'])
    expect([...selectComputedMythics(candidates.slice(0, 2), 1)]).toEqual(['newcomer'])
  })
})
