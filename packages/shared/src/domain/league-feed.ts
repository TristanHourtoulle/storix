import { type CardTier, isTierAtLeast, tierRank } from './cards'
import type { EmblemId } from './emblems'

export const LEAGUE_EVENT_TYPES = [
  'booster_opened',
  'card_pulled',
  'card_published',
  'card_promoted',
  'card_foiled',
  'emblem_unlocked',
  'member_joined',
  'card_tier_reached',
] as const

export type LeagueEventType = (typeof LEAGUE_EVENT_TYPES)[number]

export const FEED_FILTER_IDS = ['all', 'pulls', 'photos', 'feats'] as const

export type FeedFilter = (typeof FEED_FILTER_IDS)[number]

export const FEED_FILTERS: Readonly<Record<FeedFilter, readonly LeagueEventType[]>> = {
  all: LEAGUE_EVENT_TYPES,
  pulls: ['booster_opened', 'card_pulled', 'card_tier_reached'],
  photos: ['card_published'],
  feats: ['card_promoted', 'card_foiled', 'emblem_unlocked', 'member_joined'],
}

export const FEED_WINDOW_DAYS = 30
export const FEED_GROUP_WINDOW_MS = 3 * 3_600_000
export const FEED_HOME_ROWS = 8

/** Event data kept in storage: ids, tiers and flags only, never titles or image URLs. */
export interface LeagueEventPayload {
  tier?: CardTier
  isPremium?: boolean
  isDiscovery?: boolean
  fromTier?: CardTier
  toTier?: CardTier
  emblemId?: EmblemId
  openingId?: string
  count?: number
}

export interface FeedEvent {
  id: string
  type: LeagueEventType
  actorId: string | null
  cardId: string | null
  at: Date
  payload: LeagueEventPayload
}

export interface FeedGroup {
  key: string
  type: LeagueEventType
  actorIds: (string | null)[]
  eventIds: string[]
  cardId: string | null
  count: number
  at: Date
  bestTier: CardTier | null
  hasPremium: boolean
  payload: LeagueEventPayload
  isNew: boolean
}

const NEVER_GROUPED: ReadonlySet<LeagueEventType> = new Set([
  'card_tier_reached',
  'card_promoted',
  'member_joined',
])

function groupKeyOf(event: FeedEvent): string | null {
  if (NEVER_GROUPED.has(event.type)) return null
  if (event.type === 'card_pulled' && isTierAtLeast(event.payload.tier ?? 'common', 'legendary')) {
    return null
  }
  if (event.type === 'booster_opened') return event.type
  return `${event.type}:${event.actorId ?? ''}`
}

function bestOf(a: CardTier | null, b: CardTier | undefined): CardTier | null {
  if (b === undefined) return a
  if (a === null) return b
  return tierRank(b) > tierRank(a) ? b : a
}

function isNewEvent(event: FeedEvent, viewerId: string, lastSeenAt: Date | null): boolean {
  return lastSeenAt !== null && event.at > lastSeenAt && event.actorId !== viewerId
}

function startGroup(event: FeedEvent, isNew: boolean): FeedGroup {
  return {
    key: event.id,
    type: event.type,
    actorIds: [event.actorId],
    eventIds: [event.id],
    cardId: event.cardId,
    count: event.payload.count ?? 1,
    at: event.at,
    bestTier: event.payload.tier ?? null,
    hasPremium: event.payload.isPremium === true,
    payload: event.payload,
    isNew,
  }
}

function extendGroup(group: FeedGroup, event: FeedEvent, isNew: boolean): FeedGroup {
  return {
    ...group,
    actorIds: group.actorIds.includes(event.actorId)
      ? group.actorIds
      : [...group.actorIds, event.actorId],
    eventIds: [...group.eventIds, event.id],
    count: group.count + (event.payload.count ?? 1),
    bestTier: bestOf(group.bestTier, event.payload.tier),
    hasPremium: group.hasPremium || event.payload.isPremium === true,
    isNew: group.isNew || isNew,
  }
}

/**
 * Groups raw feed events (newest first) into display rows, newest first.
 * Legendary/Mythic pulls, tier milestones, promotions and arrivals stay alone; booster openings
 * from any members collapse within the window; other events collapse per actor and type.
 */
export function groupFeed(
  events: readonly FeedEvent[],
  options: { viewerId: string; lastSeenAt: Date | null; windowMs?: number },
): FeedGroup[] {
  const windowMs = options.windowMs ?? FEED_GROUP_WINDOW_MS
  const ordered = events.toSorted((a, b) => b.at.getTime() - a.at.getTime())
  const { groups } = ordered.reduce<{ groups: FeedGroup[]; open: ReadonlyMap<string, number> }>(
    (acc, event) => {
      const isNew = isNewEvent(event, options.viewerId, options.lastSeenAt)
      const key = groupKeyOf(event)
      const openIndex = key === null ? undefined : acc.open.get(key)
      const open = openIndex === undefined ? undefined : acc.groups[openIndex]
      if (
        open !== undefined &&
        openIndex !== undefined &&
        open.at.getTime() - event.at.getTime() <= windowMs
      ) {
        return {
          groups: acc.groups.with(openIndex, extendGroup(open, event, isNew)),
          open: acc.open,
        }
      }
      const groups = [...acc.groups, startGroup(event, isNew)]
      const nextOpen = key === null ? acc.open : new Map(acc.open).set(key, groups.length - 1)
      return { groups, open: nextOpen }
    },
    { groups: [], open: new Map() },
  )
  return groups
}
