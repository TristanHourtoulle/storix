import type { Database } from '@storix/db'
import {
  encodeFeedCursor,
  FEED_FILTERS,
  FEED_WINDOW_DAYS,
  groupFeed,
  type CollectionCard,
  type FeedActor,
  type FeedBravo,
  type FeedCursor,
  type FeedEvent,
  type FeedGroup,
  type FeedHighlights,
  type FeedPage,
  type FeedQuery,
  type FeedRow,
} from '@storix/shared'
import { AppError, notFound } from '../../lib/errors'
import type { MediaSigner } from '../../lib/media-signer'
import type { HistoryCardRow } from '../boosters/booster-history.repository'
import { toCollectionCard, withViewerCopies } from '../cards/card-views'
import { listOwnedCopies } from '../copies/copies.repository'
import { listStackEntries } from '../copies/stacks.repository'
import type { Membership } from '../leagues/leagues.service'
import {
  findLeagueEvent,
  findReadAt,
  insertBravo,
  listBravoStats,
  listFeedActors,
  listFeedCards,
  listFeedEvents,
  listMythicPromotions,
  markReadAt,
  type BravoStatsRow,
  type FeedActorRow,
  type FeedEventRow,
} from './league-feed.repository'

export interface LeagueFeedService {
  listFeed(m: Membership, query: FeedQuery): Promise<FeedPage>
  markFeedSeen(m: Membership): Promise<void>
  sendBravo(m: Membership, eventId: string): Promise<FeedBravo>
  listHighlights(m: Membership): Promise<FeedHighlights>
  markHighlightsSeen(m: Membership): Promise<void>
}

export interface LeagueFeedServiceDeps {
  db: Database
  signer: MediaSigner
  clock: () => Date
}

const RAW_PAGE_SIZE = 120
const DAY_MS = 86_400_000

interface FeedContext {
  cards: ReadonlyMap<string, CollectionCard>
  actors: ReadonlyMap<string, FeedActorRow>
  bravos: ReadonlyMap<string, BravoStatsRow>
}

function toFeedEvent(row: FeedEventRow): FeedEvent {
  return {
    id: row.id,
    type: row.type,
    actorId: row.actorId,
    cardId: row.cardId,
    at: row.visibleAt,
    payload: row.payload,
  }
}

function isAfter(event: FeedEvent, cut: FeedCursor): boolean {
  const ms = event.at.getTime()
  return ms > cut.atMs || (ms === cut.atMs && event.id > cut.id)
}

function cursorOf(event: FeedEvent): FeedCursor {
  return { atMs: event.at.getTime(), id: event.id }
}

function toActor(actorId: string | null, actors: ReadonlyMap<string, FeedActorRow>): FeedActor {
  const row = actorId === null ? undefined : actors.get(actorId)
  if (row === undefined) return { userId: null, displayUsername: null }
  return { userId: row.isMember ? row.userId : null, displayUsername: row.displayUsername }
}

function toRow(group: FeedGroup, ctx: FeedContext): FeedRow {
  const bravo = group.type === 'card_promoted' ? ctx.bravos.get(group.key) : undefined
  return {
    id: group.key,
    kind: group.type,
    actors: group.actorIds.map((actorId) => toActor(actorId, ctx.actors)),
    count: group.count,
    card: group.cardId === null ? null : (ctx.cards.get(group.cardId) ?? null),
    tier: group.bestTier,
    isPremium: group.hasPremium,
    isDiscovery: group.payload.isDiscovery === true,
    fromTier: group.payload.fromTier ?? null,
    toTier: group.payload.toTier ?? null,
    emblemId: group.payload.emblemId ?? null,
    bravoCount: bravo?.bravoCount ?? 0,
    hasBravoed: bravo?.hasBravoed ?? false,
    isNew: group.isNew,
    at: group.at.toISOString(),
  }
}

/** Builds the service reading the league activity feed, its Bravos and the Mythic highlights. */
export function createLeagueFeedService({
  db,
  signer,
  clock,
}: LeagueFeedServiceDeps): LeagueFeedService {
  async function viewCards(
    m: Membership,
    cardIds: readonly string[],
  ): Promise<Map<string, CollectionCard>> {
    const ids = [...new Set(cardIds)]
    const [rows, copies, stacks] = await Promise.all([
      listFeedCards(db, { leagueId: m.leagueId, cardIds: ids }),
      listOwnedCopies(db, { leagueId: m.leagueId, ownerId: m.userId, cardIds: ids }),
      listStackEntries(db, { leagueId: m.leagueId, ownerId: m.userId, cardIds: ids }),
    ])
    const toCard = ({ cardId, ...rest }: HistoryCardRow): CollectionCard =>
      toCollectionCard(withViewerCopies({ id: cardId, ...rest }, copies, stacks), signer)
    return new Map(rows.map((row) => [row.cardId, toCard(row)]))
  }

  async function contextFor(m: Membership, events: readonly FeedEvent[]): Promise<FeedContext> {
    const actorIds = events.flatMap((event) => (event.actorId === null ? [] : [event.actorId]))
    const cardIds = events.flatMap((event) => (event.cardId === null ? [] : [event.cardId]))
    const promotionIds = events.filter((e) => e.type === 'card_promoted').map((e) => e.id)
    const [cards, actors, bravos] = await Promise.all([
      viewCards(m, cardIds),
      listFeedActors(db, { leagueId: m.leagueId, userIds: [...new Set(actorIds)] }),
      listBravoStats(db, { eventIds: promotionIds, viewerId: m.userId }),
    ])
    return {
      cards,
      actors: new Map(actors.map((actor) => [actor.userId, actor])),
      bravos: new Map(bravos.map((bravo) => [bravo.eventId, bravo])),
    }
  }

  return {
    async listFeed(m, query) {
      const now = clock()
      const [raw, lastSeenAt] = await Promise.all([
        listFeedEvents(db, {
          leagueId: m.leagueId,
          types: FEED_FILTERS[query.filter],
          since: new Date(now.getTime() - FEED_WINDOW_DAYS * DAY_MS),
          now,
          from: query.cursor,
          limit: RAW_PAGE_SIZE + 1,
        }),
        findReadAt(db, { leagueId: m.leagueId, userId: m.userId, column: 'feedSeenAt' }),
      ])
      const boundary = raw[RAW_PAGE_SIZE]
      const events = raw.slice(0, RAW_PAGE_SIZE).map(toFeedEvent)
      const options = { viewerId: m.userId, lastSeenAt }
      const groups = groupFeed(events, options)
      const firstLeftOut = groups[query.limit]
      const cutEvent =
        firstLeftOut === undefined
          ? undefined
          : events.find((event) => event.id === firstLeftOut.key)
      const cut = cutEvent === undefined ? undefined : cursorOf(cutEvent)
      const kept = cut === undefined ? events : events.filter((event) => isAfter(event, cut))
      const rows = (cut === undefined ? groups : groupFeed(kept, options)).slice(0, query.limit)
      const next = cut ?? (boundary === undefined ? undefined : cursorOf(toFeedEvent(boundary)))
      const ctx = await contextFor(m, kept)
      return {
        rows: rows.map((group) => toRow(group, ctx)),
        nextCursor: next === undefined ? null : encodeFeedCursor(next),
        lastSeenAt: lastSeenAt === null ? null : lastSeenAt.toISOString(),
      }
    },

    async markFeedSeen(m) {
      await markReadAt(db, { ...m, column: 'feedSeenAt', at: clock() })
    },

    async sendBravo(m, eventId) {
      const event = await findLeagueEvent(db, { leagueId: m.leagueId, eventId })
      if (event === null) throw notFound('Event not found')
      if (event.type !== 'card_promoted' || event.actorId === m.userId) {
        throw new AppError('BRAVO_NOT_ALLOWED', 409, 'This event cannot receive a Bravo')
      }
      await insertBravo(db, { eventId, userId: m.userId, now: clock() })
      const [stats] = await listBravoStats(db, { eventIds: [eventId], viewerId: m.userId })
      return { bravoCount: stats?.bravoCount ?? 0, hasBravoed: stats?.hasBravoed ?? false }
    },

    async listHighlights(m) {
      const now = clock()
      const seenAt = await findReadAt(db, {
        leagueId: m.leagueId,
        userId: m.userId,
        column: 'mythicBannerSeenAt',
      })
      const rows = await listMythicPromotions(db, {
        leagueId: m.leagueId,
        viewerId: m.userId,
        after: seenAt,
        since: new Date(now.getTime() - FEED_WINDOW_DAYS * DAY_MS),
        now,
      })
      const events = rows.map(toFeedEvent)
      const ctx = await contextFor(m, events)
      return {
        highlights: events.map((event) => {
          const bravo = ctx.bravos.get(event.id)
          return {
            eventId: event.id,
            actor: toActor(event.actorId, ctx.actors),
            card: event.cardId === null ? null : (ctx.cards.get(event.cardId) ?? null),
            toTier: event.payload.toTier ?? 'mythic',
            bravoCount: bravo?.bravoCount ?? 0,
            hasBravoed: bravo?.hasBravoed ?? false,
            at: event.at.toISOString(),
          }
        }),
      }
    },

    async markHighlightsSeen(m) {
      await markReadAt(db, { ...m, column: 'mythicBannerSeenAt', at: clock() })
    },
  }
}
