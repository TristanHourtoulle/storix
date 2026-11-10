import {
  cardCopies,
  cardCopyStacks,
  cards,
  cardTags,
  cardTier,
  media,
  memberWallets,
  reactions,
  user,
  type DbExecutor,
} from '@storix/db'
import {
  CARD_TIERS,
  mediaVariantsSchema,
  nextTier,
  PROMOTION_COPIES,
  promotionCost,
  type CardTier,
  type CollectionCursor,
  type CollectionSort,
} from '@storix/shared'
import { and, asc, desc, eq, isNotNull, isNull, lt, or, sql, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import {
  authorIsFormerMember,
  authorMembership,
  authorMembershipOn,
} from './card-author.repository'

export interface CollectionRow {
  id: string
  number: number
  title: string
  status: 'active' | 'hidden'
  tier: CardTier
  isProvisional: boolean
  authorId: string | null
  authorName: string | null
  authorIsFormerMember: boolean
  thumbhash: string
  dominantColor: string
  width: number
  height: number
  variants: (typeof media.$inferSelect)['variants']
  normalTier: CardTier | null
  foilTier: CardTier | null
  normalPromotedTier: CardTier | null
  foilPromotedTier: CardTier | null
  stackCount: number
  firstCopyAt: Date | null
}

export interface CollectionListRow extends CollectionRow {
  reactionTotal: number
  lastReactedAtMs: number
}

export interface CardTaggedRow {
  userId: string
  displayUsername: string
}

export interface CardViewerRow extends CollectionRow {
  capturedAt: Date | null
  isCaptureDateValidated: boolean
  createdAt: Date
  discoveredById: string | null
  discoveredAt: Date | null
  discovererName: string | null
  tagged: CardTaggedRow[]
}

export interface CollectionFilters {
  leagueId: string
  viewerId: string
  authorId?: string
  tier?: CardTier
  upgradable?: boolean
  taggedUserId?: string
}

const discoverer = alias(user, 'discoverer')

const displayName = sql<string>`coalesce(${user.displayUsername}, ${user.username}, ${user.name})`
const discovererName = sql<
  string | null
>`coalesce(${discoverer.displayUsername}, ${discoverer.username}, ${discoverer.name})`

function viewerCopies(db: DbExecutor, input: { leagueId: string; viewerId: string }) {
  return db
    .select({
      cardId: cardCopies.cardId,
      normalTier:
        sql<CardTier | null>`max(${cardCopies.tierAtMint}) filter (where ${cardCopies.variant} = 'normal')`.as(
          'normal_tier',
        ),
      foilTier:
        sql<CardTier | null>`max(${cardCopies.tierAtMint}) filter (where ${cardCopies.variant} = 'foil')`.as(
          'foil_tier',
        ),
      normalPromotedTier:
        sql<CardTier | null>`max(${cardCopies.promotedTier}) filter (where ${cardCopies.variant} = 'normal')`.as(
          'normal_promoted_tier',
        ),
      foilPromotedTier:
        sql<CardTier | null>`max(${cardCopies.promotedTier}) filter (where ${cardCopies.variant} = 'foil')`.as(
          'foil_promoted_tier',
        ),
      firstCopyAt: sql<Date | null>`date_trunc('milliseconds', min(${cardCopies.createdAt}))`
        .mapWith(cardCopies.createdAt)
        .as('first_copy_at'),
    })
    .from(cardCopies)
    .where(and(eq(cardCopies.leagueId, input.leagueId), eq(cardCopies.ownerId, input.viewerId)))
    .groupBy(cardCopies.cardId)
    .as('owned')
}

function viewerStacks(db: DbExecutor, input: { leagueId: string; viewerId: string }) {
  return db
    .select({
      cardId: cardCopyStacks.cardId,
      stackCount: sql<number>`sum(${cardCopyStacks.count})::int`.as('stack_count'),
    })
    .from(cardCopyStacks)
    .where(
      and(eq(cardCopyStacks.leagueId, input.leagueId), eq(cardCopyStacks.ownerId, input.viewerId)),
    )
    .groupBy(cardCopyStacks.cardId)
    .as('stacked')
}

function cardReactionStats(db: DbExecutor, input: { leagueId: string }) {
  return db
    .select({
      cardId: reactions.cardId,
      total: sql<number>`count(*)::int`.as('reaction_total'),
      lastMs:
        sql<number>`(extract(epoch from date_trunc('milliseconds', max(${reactions.createdAt}))) * 1000)::double precision`.as(
          'last_reacted_ms',
        ),
    })
    .from(reactions)
    .innerJoin(cards, eq(cards.id, reactions.cardId))
    .where(eq(cards.leagueId, input.leagueId))
    .groupBy(reactions.cardId)
    .as('reaction_stats')
}

function collectionColumns(
  owned: ReturnType<typeof viewerCopies>,
  stacked: ReturnType<typeof viewerStacks>,
) {
  return {
    id: cards.id,
    number: cards.number,
    title: cards.title,
    status: cards.status,
    tier: cards.tier,
    isProvisional: cards.isProvisional,
    authorId: cards.authorId,
    authorName: displayName,
    authorIsFormerMember,
    thumbhash: media.thumbhash,
    dominantColor: media.dominantColor,
    width: media.width,
    height: media.height,
    variants: media.variants,
    normalTier: owned.normalTier,
    foilTier: owned.foilTier,
    normalPromotedTier: owned.normalPromotedTier,
    foilPromotedTier: owned.foilPromotedTier,
    stackCount: sql<number>`coalesce(${stacked.stackCount}, 0)::int`,
    firstCopyAt: owned.firstCopyAt,
  }
}

/** Mirrors `personalDisplayTier`: a promoted copy never shows below the league tier. */
function displayTierOf(owned: ReturnType<typeof viewerCopies>): SQL<CardTier> {
  return sql<CardTier>`(CASE WHEN greatest(${owned.normalPromotedTier}, ${owned.foilPromotedTier}) IS NULL THEN coalesce(greatest(${owned.normalTier}, ${owned.foilTier}), ${cards.tier}) ELSE greatest(${owned.normalTier}, ${owned.foilTier}, ${owned.normalPromotedTier}, ${owned.foilPromotedTier}, ${cards.tier}) END)`
}

/** Mirrors `promotionCost(nextTier(from))` for each tier below mythic, NULL for mythic. */
function promotionCostOf(from: SQL<CardTier>): SQL<number | null> {
  const steps = CARD_TIERS.flatMap((tier) => {
    const target = nextTier(tier)
    return target === null ? [] : [sql`WHEN ${tierParam(tier)} THEN ${promotionCost(target)}::int`]
  })
  return sql<number | null>`(CASE ${from} ${sql.join(steps, sql` `)} END)`
}

function viewerDust(input: { leagueId: string; viewerId: string }): SQL<number> {
  return sql<number>`coalesce((SELECT ${memberWallets.dust} FROM ${memberWallets} WHERE ${memberWallets.leagueId} = ${input.leagueId} AND ${memberWallets.userId} = ${input.viewerId}), 0)`
}

/** Mirrors `promotionDecision(...).allowed`: owned, enough stacked copies and dust for the next tier. */
function upgradableNow(
  input: CollectionFilters,
  owned: ReturnType<typeof viewerCopies>,
  stacked: ReturnType<typeof viewerStacks>,
): SQL | undefined {
  const from = sql<CardTier>`greatest(${displayTierOf(owned)}, ${cards.tier})`
  return and(
    isNotNull(owned.cardId),
    sql`coalesce(${stacked.stackCount}, 0) >= ${PROMOTION_COPIES}::int`,
    sql`${viewerDust(input)} >= ${promotionCostOf(from)}`,
  )
}

function taggedWith(userId: string): SQL {
  return sql`exists (select 1 from ${cardTags} where ${cardTags.cardId} = ${cards.id} and ${cardTags.userId} = ${userId})`
}

function collectionWhere(
  input: CollectionFilters,
  owned: ReturnType<typeof viewerCopies>,
  stacked: ReturnType<typeof viewerStacks>,
  visibility: SQL | undefined,
): SQL | undefined {
  return and(
    eq(cards.leagueId, input.leagueId),
    visibility,
    input.authorId === undefined ? undefined : eq(cards.authorId, input.authorId),
    input.tier === undefined ? undefined : eq(displayTierOf(owned), input.tier),
    input.upgradable === true ? upgradableNow(input, owned, stacked) : undefined,
    input.taggedUserId === undefined ? undefined : taggedWith(input.taggedUserId),
  )
}

function parseVariants<T extends { variants: unknown }>(
  row: T,
): Omit<T, 'variants'> & { variants: CollectionRow['variants'] } {
  return { ...row, variants: mediaVariantsSchema.parse(row.variants) }
}

function tierParam(tier: CardTier): SQL {
  return sql`${tier}::${sql.identifier(cardTier.enumName)}`
}

interface ReactionRanking {
  total: SQL<number>
  lastMs: SQL<number>
}

const NO_REACTION_RANKING: ReactionRanking = {
  total: sql<number>`0`,
  lastMs: sql<number>`0`,
}

function reactionRankingOf(stats: ReturnType<typeof cardReactionStats>): ReactionRanking {
  return {
    total: sql<number>`coalesce(${stats.total}, 0)::int`,
    lastMs: sql<number>`coalesce(${stats.lastMs}, 0)::double precision`,
  }
}

function afterCursor(
  owned: ReturnType<typeof viewerCopies>,
  ranking: ReactionRanking,
  cursor: CollectionCursor | undefined,
): SQL | undefined {
  if (cursor === undefined) return undefined
  switch (cursor.kind) {
    case 'rarity':
      return sql`(${displayTierOf(owned)}, ${cards.number}) < (${tierParam(cursor.tier)}, ${cursor.number})`
    case 'discovered': {
      const iso = new Date(cursor.discoveredAt).toISOString()
      return or(
        isNull(owned.firstCopyAt),
        sql`(${owned.firstCopyAt}, ${displayTierOf(owned)}, ${cards.number}) < (${iso}::timestamptz, ${tierParam(cursor.tier)}, ${cursor.number})`,
      )
    }
    case 'undiscovered':
      return and(isNull(owned.firstCopyAt), lt(cards.number, cursor.number))
    case 'number':
      return lt(cards.number, cursor.number)
    case 'reactions':
      return sql`((${ranking.total}, ${ranking.lastMs}) < (${cursor.total}::int, ${cursor.lastReactedAt}::double precision) OR ((${ranking.total}, ${ranking.lastMs}) = (${cursor.total}::int, ${cursor.lastReactedAt}::double precision) AND ${cards.number} > ${cursor.number}))`
  }
}

function orderFor(
  sort: CollectionSort,
  owned: ReturnType<typeof viewerCopies>,
  ranking: ReactionRanking,
): SQL[] {
  switch (sort) {
    case 'rarity':
      return [desc(displayTierOf(owned)), desc(cards.number)]
    case 'discovery':
      return [
        sql`${owned.firstCopyAt} DESC NULLS LAST`,
        sql`(CASE WHEN ${owned.cardId} IS NOT NULL THEN ${displayTierOf(owned)} END) DESC NULLS LAST`,
        desc(cards.number),
      ]
    case 'number':
      return [desc(cards.number)]
    case 'reactions':
      return [desc(ranking.total), desc(ranking.lastMs), asc(cards.number)]
  }
}

function activeOrOwnedHidden(owned: ReturnType<typeof viewerCopies>): SQL | undefined {
  return or(eq(cards.status, 'active'), and(eq(cards.status, 'hidden'), isNotNull(owned.cardId)))
}

/**
 * Lists active cards, and hidden cards the viewer owns a copy of, with the viewer's copies, fetching
 * `limit + 1` rows after the cursor. `rarity` orders by displayed tier then number, `discovery` by
 * the viewer's first copy (millisecond precision) then displayed tier then number with unowned
 * cards last by number, `number` by number, and `reactions` by reaction total then latest reaction
 * (millisecond precision, none last) then lowest number, each newest, rarest or most reacted first.
 * Reaction stats are only joined for the `reactions` sort.
 */
export async function listCollection(
  db: DbExecutor,
  input: CollectionFilters & { sort: CollectionSort; after?: CollectionCursor; limit: number },
): Promise<CollectionListRow[]> {
  const owned = viewerCopies(db, input)
  const stacked = viewerStacks(db, input)
  const stats = input.sort === 'reactions' ? cardReactionStats(db, input) : null
  const ranking = stats === null ? NO_REACTION_RANKING : reactionRankingOf(stats)
  const query = db
    .select({
      ...collectionColumns(owned, stacked),
      reactionTotal: ranking.total,
      lastReactedAtMs: ranking.lastMs,
    })
    .from(cards)
    .innerJoin(media, eq(media.id, cards.mediaId))
    .leftJoin(user, eq(user.id, cards.authorId))
    .leftJoin(authorMembership, authorMembershipOn)
    .leftJoin(owned, eq(owned.cardId, cards.id))
    .leftJoin(stacked, eq(stacked.cardId, cards.id))
    .$dynamic()
  const joined = stats === null ? query : query.leftJoin(stats, eq(stats.cardId, cards.id))
  const rows = await joined
    .where(
      and(
        collectionWhere(input, owned, stacked, activeOrOwnedHidden(owned)),
        afterCursor(owned, ranking, input.after),
      ),
    )
    .orderBy(...orderFor(input.sort, owned, ranking))
    .limit(input.limit + 1)
  return rows.map(parseVariants)
}

/** Counts the active cards matching the filters and how many of them the viewer owns. */
export async function countCollection(
  db: DbExecutor,
  input: CollectionFilters,
): Promise<{ total: number; owned: number }> {
  const owned = viewerCopies(db, input)
  const stacked = viewerStacks(db, input)
  const rows = await db
    .select({
      total: sql<number>`count(*)::int`,
      owned: sql<number>`count(${owned.cardId})::int`,
    })
    .from(cards)
    .leftJoin(owned, eq(owned.cardId, cards.id))
    .leftJoin(stacked, eq(stacked.cardId, cards.id))
    .where(collectionWhere(input, owned, stacked, eq(cards.status, 'active')))
  return rows[0] ?? { total: 0, owned: 0 }
}

/** Finds a card of a league, active or hidden, with its media, discoverer, tagged members and the viewer's copies. */
export async function findCardForViewer(
  db: DbExecutor,
  input: { leagueId: string; cardId: string; viewerId: string },
): Promise<CardViewerRow | null> {
  const owned = viewerCopies(db, input)
  const stacked = viewerStacks(db, input)
  const rows = await db
    .select({
      ...collectionColumns(owned, stacked),
      capturedAt: media.capturedAt,
      isCaptureDateValidated: media.isCaptureDateValidated,
      createdAt: cards.createdAt,
      discoveredById: cards.discoveredById,
      discoveredAt: cards.discoveredAt,
      discovererName,
    })
    .from(cards)
    .innerJoin(media, eq(media.id, cards.mediaId))
    .leftJoin(user, eq(user.id, cards.authorId))
    .leftJoin(authorMembership, authorMembershipOn)
    .leftJoin(discoverer, eq(discoverer.id, cards.discoveredById))
    .leftJoin(owned, eq(owned.cardId, cards.id))
    .leftJoin(stacked, eq(stacked.cardId, cards.id))
    .where(and(eq(cards.id, input.cardId), eq(cards.leagueId, input.leagueId)))
    .limit(1)
  const row = rows[0]
  if (row === undefined) return null
  const tagged = await db
    .select({ userId: user.id, displayUsername: displayName })
    .from(cardTags)
    .innerJoin(user, eq(user.id, cardTags.userId))
    .where(eq(cardTags.cardId, input.cardId))
    .orderBy(sql`lower(${displayName})`, user.id)
  return { ...parseVariants(row), tagged }
}
