import { type CardTier, tierRank } from './cards'
import type { TierSource } from './rarity-tiers'

export const JOURNEY_CAUSES = ['arrival', 'admin', 'up', 'down'] as const

export type JourneyCause = (typeof JOURNEY_CAUSES)[number]

export type JourneyStep =
  | { kind: 'league'; tier: CardTier; at: string; cause: JourneyCause }
  | { kind: 'mine'; tier: CardTier; at: string; cause: null }

export interface RarityHistoryRow {
  fromTier: CardTier | null
  toTier: CardTier
  source: TierSource
  computedAt: Date | string
}

export interface PersonalUpgrade {
  tier: CardTier
  at: Date | string
}

const toIso = (value: Date | string): string => new Date(value).toISOString()

const byOldest = (a: { at: string }, b: { at: string }): number => a.at.localeCompare(b.at)

function causeOf(row: RarityHistoryRow, previous: CardTier | null): JourneyCause {
  if (previous === null) return 'arrival'
  if (row.source !== 'computed') return 'admin'
  return tierRank(row.toTier) > tierRank(previous) ? 'up' : 'down'
}

/**
 * Builds a card's rarity journey, newest first: consecutive rows with the same tier collapse into
 * one step, the first step is the arrival, admin pins and bounds read as admin choices, and the
 * viewer's own upgrade is inserted at its date.
 */
export function rarityJourney(
  rows: readonly RarityHistoryRow[],
  mine: PersonalUpgrade | null = null,
): JourneyStep[] {
  const oldestFirst = rows.map((row) => ({ row, at: toIso(row.computedAt) })).toSorted(byOldest)
  const league = oldestFirst.reduce<JourneyStep[]>((steps, { row, at }) => {
    const last = steps.at(-1)
    const previous = last === undefined ? null : last.tier
    if (previous === row.toTier) return steps
    return [...steps, { kind: 'league', tier: row.toTier, at, cause: causeOf(row, previous) }]
  }, [])
  const personal: JourneyStep[] =
    mine === null ? [] : [{ kind: 'mine', tier: mine.tier, at: toIso(mine.at), cause: null }]
  return [...league, ...personal].toSorted(byOldest).toReversed()
}
