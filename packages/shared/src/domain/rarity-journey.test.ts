import { describe, expect, it } from 'vitest'
import { rarityJourney, type RarityHistoryRow } from './rarity-journey'

const row = (
  toTier: RarityHistoryRow['toTier'],
  day: number,
  source: RarityHistoryRow['source'] = 'computed',
): RarityHistoryRow => ({
  fromTier: null,
  toTier,
  source,
  computedAt: new Date(Date.UTC(2026, 10, day)),
})

describe('rarityJourney', () => {
  it('collapses consecutive rows with the same tier', () => {
    const steps = rarityJourney([
      row('common', 1),
      row('common', 2),
      row('rare', 3),
      row('rare', 4),
    ])
    expect(steps.map((s) => s.tier)).toEqual(['rare', 'common'])
  })

  it('labels the first step as arrival and later moves up or down', () => {
    const steps = rarityJourney([row('rare', 1), row('epic', 2), row('uncommon', 3)])
    expect(steps.map((s) => s.cause)).toEqual(['down', 'up', 'arrival'])
  })

  it('labels pinned and bounded changes as admin choices', () => {
    const steps = rarityJourney([
      row('rare', 1),
      row('mythic', 2, 'pinned'),
      row('epic', 3, 'bounded'),
    ])
    expect(steps.map((s) => s.cause)).toEqual(['admin', 'admin', 'arrival'])
  })

  it('labels the computed tier right after a pin as the pin being removed', () => {
    const steps = rarityJourney([row('rare', 1), row('mythic', 2, 'pinned'), row('rare', 3)])
    expect(steps.map((s) => s.cause)).toEqual(['unpinned', 'admin', 'arrival'])
  })

  it('inserts the viewer upgrade at its date', () => {
    const steps = rarityJourney([row('common', 1), row('rare', 5)], {
      tier: 'uncommon',
      at: new Date(Date.UTC(2026, 10, 3)),
    })
    expect(steps.map((s) => s.kind)).toEqual(['league', 'mine', 'league'])
  })
})
