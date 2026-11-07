import { cardCopies, cards, cardTags, media, user, type DbExecutor } from '@storix/db'
import { mediaVariantsSchema, type CardTier } from '@storix/shared'
import { and, desc, eq, isNotNull, lt, or, sql, type SQL } from 'drizzle-orm'
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
    })
    .from(cardCopies)
    .where(and(eq(cardCopies.leagueId, input.leagueId), eq(cardCopies.ownerId, input.viewerId)))
    .groupBy(cardCopies.cardId)
    .as('owned')
}

function collectionColumns(owned: ReturnType<typeof viewerCopies>) {
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
  }
}

function displayTierOf(owned: ReturnType<typeof viewerCopies>): SQL<CardTier> {
  return sql<CardTier>`coalesce(greatest(${owned.normalTier}, ${owned.foilTier}), ${cards.tier})`
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

function activeOrOwnedHidden(owned: ReturnType<typeof viewerCopies>): SQL | undefined {
  return or(eq(cards.status, 'active'), and(eq(cards.status, 'hidden'), isNotNull(owned.cardId)))
}

/**
 * Lists active cards, and hidden cards the viewer owns a copy of, with the viewer's copies,
 * newest number first, fetching `limit + 1` rows.
 */
export async function listCollection(
  db: DbExecutor,
  input: CollectionFilters & { beforeNumber?: number; limit: number },
): Promise<CollectionRow[]> {
  const owned = viewerCopies(db, input)
  const rows = await db
    .select(collectionColumns(owned))
    .from(cards)
    .innerJoin(media, eq(media.id, cards.mediaId))
    .leftJoin(user, eq(user.id, cards.authorId))
    .leftJoin(authorMembership, authorMembershipOn)
    .leftJoin(owned, eq(owned.cardId, cards.id))
    .where(
      and(
        collectionWhere(input, owned, activeOrOwnedHidden(owned)),
        input.beforeNumber === undefined ? undefined : lt(cards.number, input.beforeNumber),
      ),
    )
    .orderBy(desc(cards.number))
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
  const rows = await db
    .select({
      ...collectionColumns(owned),
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
