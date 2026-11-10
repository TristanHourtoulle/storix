import {
  emblemDefinition,
  isTierAtLeast,
  type CardTier,
  type CollectionCard,
  type FeedActor,
  type FeedRow,
} from '@storix/shared'
import type { IconName } from '@/components/ui/icon'
import { groupByParisDay } from '@/lib/paris-dates'

const SUMMARY_NAMES = 2

export interface FeedSection {
  key: string
  label: string
  rows: FeedRow[]
}

/** An actor's name, or "Ancien membre" once they left the league or deleted their account. */
export function actorName(actor: FeedActor): string {
  return actor.displayUsername ?? 'Ancien membre'
}

/** "Léa", "Léa et Tom" or "Tom, Léa et 4 autres" from a row's actors. */
export function actorsLabel(actors: readonly FeedActor[]): string {
  const names = actors.map(actorName)
  if (names.length <= 1) return names[0] ?? 'Ancien membre'
  if (names.length <= SUMMARY_NAMES + 1) {
    return `${names.slice(0, -1).join(', ')} et ${names.at(-1)}`
  }
  return `${names.slice(0, SUMMARY_NAMES).join(', ')} et ${names.length - SUMMARY_NAMES} autres`
}

/** The card's title in quotes when the viewer may read it, "une carte" otherwise. */
export function cardMention(card: CollectionCard | null): string {
  if (card !== null && (card.kind === 'owned' || card.kind === 'unpulled')) {
    return `« ${card.title} »`
  }
  return 'une carte'
}

/** The tier a row is tinted with: the reached tier for promotions, the emblem's tier, the best tier otherwise. */
export function rowTier(row: FeedRow): CardTier | null {
  const [emblemId] = row.emblemIds
  if (row.kind === 'emblem_unlocked' && emblemId !== undefined) {
    return emblemDefinition(emblemId).tier
  }
  return row.toTier ?? row.tier
}

/** True for the big moments: Legendary or Mythic pulls and milestones, promotions, premium boosters. */
export function isBigRow(row: FeedRow): boolean {
  if (row.kind === 'card_promoted') return true
  if (row.kind === 'booster_opened') return row.isPremium
  if (row.kind === 'card_pulled' || row.kind === 'card_tier_reached') {
    return row.tier !== null && isTierAtLeast(row.tier, 'legendary')
  }
  return false
}

/** The line icon of a row; emblems and arrivals draw their own glyph instead. */
export function rowIcon(row: FeedRow): IconName {
  switch (row.kind) {
    case 'booster_opened':
      return 'pack'
    case 'card_published':
      return 'shot'
    case 'card_promoted':
      return 'up'
    case 'card_foiled':
      return 'star'
    case 'card_pulled':
    case 'card_tier_reached':
      if (row.tier === 'mythic') return 'gem'
      return row.tier !== null && isTierAtLeast(row.tier, 'legendary') ? 'crown' : 'pack'
    case 'emblem_unlocked':
      return 'star'
    case 'member_joined':
      return 'user'
  }
}

/** Splits rows into "since your last visit", then one section per Paris day. */
export function feedSections(rows: readonly FeedRow[], now: Date = new Date()): FeedSection[] {
  const fresh = rows.filter((row) => row.isNew)
  const older = rows.filter((row) => !row.isNew)
  const days = groupByParisDay(older, (row) => row.at, now).map(({ key, label, items }) => ({
    key,
    label,
    rows: items,
  }))
  return fresh.length > 0
    ? [{ key: 'new', label: 'Depuis ta dernière visite', rows: fresh }, ...days]
    : days
}
