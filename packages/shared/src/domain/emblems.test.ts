import { describe, expect, it } from 'vitest'
import { type EmblemId, type EmblemStats, evaluateEmblems } from './emblems'
import { resolveShowcase } from './showcase'

const ZERO: EmblemStats = {
  boostersOpened: 0,
  premiumOpened: 0,
  photosPosted: 0,
  distinctOwned: 0,
  activeCards: 0,
  reactionsGiven: 0,
  discoveries: 0,
  stackedTotal: 0,
  foilCards: 0,
  maxReactionsOnOwnPhoto: 0,
  promotedCopies: 0,
  legendaryPulls: 0,
  mythicPulls: 0,
  ownMythicPhotos: 0,
  momentsOnTime: 0,
}

const find = (stats: EmblemStats, id: EmblemId) => {
  const result = evaluateEmblems(stats).find((emblem) => emblem.id === id)
  if (result === undefined) throw new Error(id)
  return result
}

describe('evaluateEmblems', () => {
  it('should earn an emblem exactly at its threshold and not below', () => {
    expect(find({ ...ZERO, photosPosted: 9 }, 'photographer')).toMatchObject({
      progress: 9,
      target: 10,
      isEarned: false,
    })
    expect(find({ ...ZERO, photosPosted: 12 }, 'photographer')).toMatchObject({
      progress: 10,
      isEarned: true,
    })
  })

  it('should never award Archiviste in a league under 20 active cards', () => {
    expect(find({ ...ZERO, distinctOwned: 10, activeCards: 10 }, 'archivist').isEarned).toBe(false)
    expect(find({ ...ZERO, distinctOwned: 24, activeCards: 30 }, 'archivist')).toMatchObject({
      target: 24,
      isEarned: true,
    })
  })

  it('should show Doré progress as boosters opened out of 20 until a premium booster', () => {
    expect(find({ ...ZERO, boostersOpened: 7 }, 'golden')).toMatchObject({
      progress: 7,
      target: 20,
      isEarned: false,
    })
    expect(find({ ...ZERO, boostersOpened: 20, premiumOpened: 1 }, 'golden').isEarned).toBe(true)
  })

  it('should award Muse when one of the member photos is Mythic', () => {
    expect(find({ ...ZERO, ownMythicPhotos: 1 }, 'muse').isEarned).toBe(true)
  })
})

describe('resolveShowcase', () => {
  it('should drop cards no longer owned and auto-fill from the ranked owned cards', () => {
    expect(resolveShowcase(['b', 'gone', 'b'], ['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toEqual([
      'b',
      'a',
      'c',
      'd',
      'e',
      'f',
    ])
  })
})
