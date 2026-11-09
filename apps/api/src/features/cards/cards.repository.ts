import {
  cardCopies,
  cardCopyStacks,
  cards,
  cardTags,
  cardTier,
  media,
  user,
  type DbExecutor,
} from '@storix/db'
import {
  mediaVariantsSchema,
  type CardTier,
  type CollectionCursor,
  type CollectionSort,
} from '@storix/shared'
import { and, desc, eq, isNotNull, isNull, lt, or, sql, type SQL } from 'drizzle-orm'
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

function collectionWhere(
  input: CollectionFilters,
  owned: ReturnType<typeof viewerCopies>,
  visibility: SQL | undefined,
): SQL | undefined {
  return and(
    eq(cards.leagueId, input.leagueId),
    visibility,
    input.authorId === undefined ? undefined : eq(cards.authorId, input.authorId),
    input.tier === undefined ? undefined : eq(displayTierOf(owned), input.tier),
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

function afterCursor(
  owned: ReturnType<typeof viewerCopies>,
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
  }
}

function orderFor(sort: CollectionSort, owned: ReturnType<typeof viewerCopies>): SQL[] {
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
  }
}

function activeOrOwnedHidden(owned: ReturnType<typeof viewerCopies>): SQL | undefined {
  return or(eq(cards.status, 'active'), and(eq(cards.status, 'hidden'), isNotNull(owned.cardId)))
}

/**
 * Lists active cards, and hidden cards the viewer owns a copy of, with the viewer's copies, fetching
 * `limit + 1` rows after the cursor. `rarity` orders by displayed tier then number, `discovery` by
 * the viewer's first copy (millisecond precision) then displayed tier then number with unowned
 * cards last by number, and `number` by number, each newest or rarest first.
 */
export async function listCollection(
  db: DbExecutor,
  input: CollectionFilters & { sort: CollectionSort; after?: CollectionCursor; limit: number },
): Promise<CollectionRow[]> {
  const owned = viewerCopies(db, input)
  const stacked = viewerStacks(db, input)
  const rows = await db
    .select(collectionColumns(owned, stacked))
    .from(cards)
    .innerJoin(media, eq(media.id, cards.mediaId))
    .leftJoin(user, eq(user.id, cards.authorId))
    .leftJoin(authorMembership, authorMembershipOn)
    .leftJoin(owned, eq(owned.cardId, cards.id))
    .leftJoin(stacked, eq(stacked.cardId, cards.id))
    .where(
      and(
        collectionWhere(input, owned, activeOrOwnedHidden(owned)),
        afterCursor(owned, input.after),
      ),
    )
    .orderBy(...orderFor(input.sort, owned))
    .limit(input.limit + 1)
  return rows.map(parseVariants)
}

/** Counts the active cards matching the filters and how many of them the viewer owns. */
export async function countCollection(
  db: DbExecutor,
  input: CollectionFilters,
): Promise<{ total: number; owned: number }> {
  const owned = viewerCopies(db, input)
  const rows = await db
    .select({
      total: sql<number>`count(*)::int`,
      owned: sql<number>`count(${owned.cardId})::int`,
    })
    .from(cards)
    .leftJoin(owned, eq(owned.cardId, cards.id))
    .where(collectionWhere(input, owned, eq(cards.status, 'active')))
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
