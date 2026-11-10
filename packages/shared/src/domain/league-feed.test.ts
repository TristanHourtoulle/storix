import { describe, expect, it } from 'vitest'
import { type FeedEvent, groupFeed, pageFeedGroups } from './league-feed'

const HOUR = 3_600_000
const NOW = new Date('2026-11-10T12:00:00Z').getTime()

const event = (overrides: Partial<FeedEvent> & Pick<FeedEvent, 'id' | 'type'>): FeedEvent => ({
  actorId: 'lea',
  cardId: null,
  at: new Date(NOW),
  payload: {},
  ...overrides,
})

describe('groupFeed', () => {
  it('should group the same actor and type within 3 hours and split beyond', () => {
    const rows = groupFeed(
      [
        event({ id: 'a', type: 'card_published', at: new Date(NOW) }),
        event({ id: 'b', type: 'card_published', at: new Date(NOW - 2 * HOUR) }),
        event({ id: 'c', type: 'card_published', at: new Date(NOW - 4 * HOUR) }),
      ],
      { viewerId: 'tom', lastSeenAt: null },
    )
    expect(rows.map((row) => row.count)).toEqual([2, 1])
  })

  it('should never group legendary pulls', () => {
    const rows = groupFeed(
      [
        event({ id: 'a', type: 'card_pulled', payload: { tier: 'legendary' } }),
        event({
          id: 'b',
          type: 'card_pulled',
          at: new Date(NOW - HOUR),
          payload: { tier: 'mythic' },
        }),
      ],
      { viewerId: 'tom', lastSeenAt: null },
    )
    expect(rows).toHaveLength(2)
  })

  it('should aggregate booster openings across members with the best tier and premium flag', () => {
    const rows = groupFeed(
      [
        event({ id: 'a', type: 'booster_opened', actorId: 'lea', payload: { tier: 'rare' } }),
        event({
          id: 'b',
          type: 'booster_opened',
          actorId: 'tom',
          at: new Date(NOW - HOUR),
          payload: { tier: 'epic', isPremium: true },
        }),
      ],
      { viewerId: 'max', lastSeenAt: null },
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      actorIds: ['lea', 'tom'],
      count: 2,
      bestTier: 'epic',
      hasPremium: true,
    })
  })

  it('should not mark the viewer own events as new', () => {
    const lastSeenAt = new Date(NOW - 5 * HOUR)
    const rows = groupFeed(
      [
        event({ id: 'a', type: 'member_joined', actorId: 'max' }),
        event({ id: 'b', type: 'member_joined', actorId: 'lea' }),
      ],
      { viewerId: 'max', lastSeenAt },
    )
    expect(rows.map((row) => row.isNew)).toEqual([false, true])
  })
})

describe('pageFeedGroups', () => {
  it('should keep group contents identical whatever the page size', () => {
    const groups = groupFeed(
      [
        event({ id: 'a', type: 'booster_opened', actorId: 'max' }),
        event({ id: 'b', type: 'member_joined', at: new Date(NOW - HOUR) }),
        event({ id: 'c', type: 'booster_opened', actorId: 'lea', at: new Date(NOW - 2 * HOUR) }),
      ],
      { viewerId: 'tom', lastSeenAt: null },
    )
    const first = pageFeedGroups(groups, { limit: 1 })
    const second = pageFeedGroups(groups, { after: first.next ?? undefined, limit: 1 })
    expect(first.groups[0]?.count).toBe(2)
    expect(second.groups.map((group) => group.key)).toEqual(['b'])
    expect(second.next).toBeNull()
  })
})
