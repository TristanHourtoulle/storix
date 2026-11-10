import { describe, expect, it } from 'vitest'
import { buildNewsPack, groupReleasesByDay, unseenReleaseIds } from './whats-new'

const RELEASES = [
  { id: '2026-12-01', publishedAt: '2026-12-01T10:00:00+01:00' },
  { id: '2026-11-20', publishedAt: '2026-11-20T10:00:00+01:00' },
  { id: '2026-11-09', publishedAt: '2026-11-09T18:00:00+01:00' },
]

const titleOf = (card: { title: string }): string => card.title

describe('unseenReleaseIds', () => {
  it('should list releases published after signup when there is no read row', () => {
    const result = unseenReleaseIds(RELEASES, {
      seenReleaseId: null,
      seenAt: null,
      memberSince: new Date('2026-11-15T00:00:00Z'),
    })

    expect(result).toEqual(['2026-12-01', '2026-11-20'])
  })

  it('should treat a release published exactly at signup as seen', () => {
    const result = unseenReleaseIds(RELEASES, {
      seenReleaseId: null,
      seenAt: null,
      memberSince: new Date('2026-11-20T10:00:00+01:00'),
    })

    expect(result).toEqual(['2026-12-01'])
  })

  it('should treat a release published later on the signup day as seen', () => {
    const result = unseenReleaseIds(RELEASES, {
      seenReleaseId: null,
      seenAt: null,
      memberSince: new Date('2026-11-20T08:00:00+01:00'),
    })

    expect(result).toEqual(['2026-12-01'])
  })

  it('should list only newer releases when a middle release is seen', () => {
    const result = unseenReleaseIds(RELEASES, {
      seenReleaseId: '2026-11-20',
      seenAt: new Date('2026-11-21T00:00:00Z'),
      memberSince: new Date('2026-01-01T00:00:00Z'),
    })

    expect(result).toEqual(['2026-12-01'])
  })

  it('should fall back to the seen date when the seen release is unknown', () => {
    const result = unseenReleaseIds(RELEASES, {
      seenReleaseId: '2026-11-15',
      seenAt: new Date('2026-11-15T12:00:00Z'),
      memberSince: new Date('2026-01-01T00:00:00Z'),
    })

    expect(result).toEqual(['2026-12-01', '2026-11-20'])
  })
})

describe('buildNewsPack', () => {
  it('should cap the pack at 8 cards and list the rest newest first', () => {
    const releases = RELEASES.slice(0, 2).map((release) => ({
      ...release,
      cards: Array.from({ length: 5 }, (_, index) => ({ title: `${release.id}-${index}` })),
    }))

    const result = buildNewsPack(releases, { maxCards: 8, titleOf })

    expect(result?.newestId).toBe('2026-12-01')
    expect(result?.cards).toHaveLength(8)
    expect(result?.cards[0]?.title).toBe('2026-12-01-0')
    expect(result?.overflowTitles).toEqual(['2026-11-20-3', '2026-11-20-4'])
  })
})

describe('groupReleasesByDay', () => {
  it('should merge releases published the same Paris day into one entry, newest first', () => {
    const releases = [
      { id: '2026-11-10-b', publishedAt: '2026-11-10T20:00:00+01:00' },
      { id: '2026-11-10', publishedAt: '2026-11-10T00:30:00+01:00' },
      { id: '2026-11-09', publishedAt: '2026-11-09T23:30:00Z' },
    ]

    const result = groupReleasesByDay(releases)

    expect(
      result.map(({ day, releases: dayReleases }) => [day, dayReleases.map((r) => r.id)]),
    ).toEqual([['2026-11-10', ['2026-11-10-b', '2026-11-10', '2026-11-09']]])
  })

  it('should return no day for no release', () => {
    expect(groupReleasesByDay([])).toEqual([])
  })
})
