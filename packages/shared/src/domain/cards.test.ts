import { describe, expect, it } from 'vitest'
import { maxTier, minTier } from './cards'

describe('tier helpers', () => {
  it('returns the higher tier', () => {
    expect(maxTier('rare', 'epic')).toBe('epic')
    expect(maxTier('mythic', 'common')).toBe('mythic')
  })

  it('returns the lower tier', () => {
    expect(minTier('rare', 'epic')).toBe('rare')
    expect(minTier('legendary', 'legendary')).toBe('legendary')
  })
})
