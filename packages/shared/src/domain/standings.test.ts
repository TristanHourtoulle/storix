import { describe, expect, it } from 'vitest'
import {
  TROPHIES,
  rankStandings,
  trophyStanding,
  type StandingEntry,
  type StandingStats,
  type TrophyDefinition,
} from './standings'

const ZERO: StandingStats = {
  uniqueCards: 0,
  copies: 0,
  rarityScore: 0,
  mythics: 0,
  legendaries: 0,
  foils: 0,
  bestFoilTier: 0,
  weekCards: 0,
  photos: 0,
  reactionsReceived: 0,
  muse: 0,
  boostersOpened: 0,
  dust: 0,
  promotions: 0,
  recycled: 0,
  discoveries: 0,
  mythicPulls: 0,
  onTimeMoments: 0,
  missions: 0,
  shopSpent: 0,
}

function person(
  name: string,
  stats: Partial<StandingStats>,
  joinedAt = '2026-01-01T00:00:00Z',
): StandingEntry {
  return { userId: name, displayUsername: name, joinedAt, stats: { ...ZERO, ...stats } }
}

const mythomane = TROPHIES.find((trophy) => trophy.id === 'myth') as TrophyDefinition

describe('standings', () => {
  it('shares the position on equal values and orders them by the theme tie-break', () => {
    const rows = rankStandings(
      [
        person('Hugo', { uniqueCards: 61, copies: 70 }),
        person('Cam', { uniqueCards: 61, copies: 90 }),
        person('Léa', { uniqueCards: 118 }),
      ],
      'collector',
    )
    expect(rows.map((row) => [row.entry.displayUsername, row.position, row.isTied])).toEqual([
      ['Léa', 1, false],
      ['Cam', 2, true],
      ['Hugo', 2, true],
    ])
  })

  it('falls back to the name, and to the earlier join for Ouvreur', () => {
    const fortune = rankStandings(
      [person('Zoé', { dust: 10 }), person('Ana', { dust: 10 })],
      'fortune',
    )
    expect(fortune.map((row) => row.entry.displayUsername)).toEqual(['Ana', 'Zoé'])
    const opener = rankStandings(
      [
        person('Ana', { boostersOpened: 5 }, '2026-03-01T00:00:00Z'),
        person('Zoé', { boostersOpened: 5 }, '2026-02-01T00:00:00Z'),
      ],
      'opener',
    )
    expect(opener.map((row) => row.entry.displayUsername)).toEqual(['Zoé', 'Ana'])
  })

  it('shares a trophy on a tie and leaves it untaken while the best is 0', () => {
    const tie = trophyStanding(
      [person('Max', { mythics: 3 }), person('Léa', { mythics: 3 }), person('Noé', {})],
      mythomane,
    )
    expect(tie.holders.map((p) => p.displayUsername)).toEqual(['Léa', 'Max'])
    expect(tie.top).toHaveLength(2)
    const crowd = trophyStanding(
      ['A', 'B', 'C', 'D'].map((name) => person(name, { mythics: 1 })),
      mythomane,
    )
    expect(crowd.top).toHaveLength(4)
    const empty = trophyStanding([person('Max', {}), person('Léa', {})], mythomane)
    expect(empty.holders).toEqual([])
    expect(empty.value).toBe(0)
  })
})
