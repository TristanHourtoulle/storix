import { cards, cardTags, media, user, type DbExecutor } from '@storix/db'
import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm'

export interface CardRow {
  id: string
  number: number
  title: string
  tier: (typeof cards.$inferSelect)['tier']
  isProvisional: boolean
  authorId: string | null
  authorName: string | null
  thumbhash: string
  dominantColor: string
  width: number
  height: number
  variants: (typeof media.$inferSelect)['variants']
}

export interface CardTaggedRow {
  userId: string
  displayUsername: string
}

export interface CardDetailRow extends CardRow {
  capturedAt: Date | null
  isCaptureDateValidated: boolean
  createdAt: Date
  tagged: CardTaggedRow[]
}

const displayName = sql<string>`coalesce(${user.displayUsername}, ${user.username}, ${user.name})`

const cardColumns = {
  id: cards.id,
  number: cards.number,
  title: cards.title,
  tier: cards.tier,
  isProvisional: cards.isProvisional,
  authorId: cards.authorId,
  authorName: displayName,
  thumbhash: media.thumbhash,
  dominantColor: media.dominantColor,
  width: media.width,
  height: media.height,
  variants: media.variants,
}

/** Lists active cards newest number first, fetching `limit + 1` rows to detect a next page. */
export function listCards(
  db: DbExecutor,
  input: { leagueId: string; authorId?: string; beforeNumber?: number; limit: number },
): Promise<CardRow[]> {
  return db
    .select(cardColumns)
    .from(cards)
    .innerJoin(media, eq(media.id, cards.mediaId))
    .leftJoin(user, eq(user.id, cards.authorId))
    .where(
      and(
        eq(cards.leagueId, input.leagueId),
        eq(cards.status, 'active'),
        input.authorId === undefined ? undefined : eq(cards.authorId, input.authorId),
        input.beforeNumber === undefined ? undefined : lt(cards.number, input.beforeNumber),
      ),
    )
    .orderBy(desc(cards.number))
    .limit(input.limit + 1)
}

/** Counts a league's active cards, optionally restricted to one author. */
export async function countCards(
  db: DbExecutor,
  input: { leagueId: string; authorId?: string },
): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(cards)
    .where(
      and(
        eq(cards.leagueId, input.leagueId),
        eq(cards.status, 'active'),
        input.authorId === undefined ? undefined : eq(cards.authorId, input.authorId),
      ),
    )
  return rows[0]?.total ?? 0
}

/** Finds an active card of a league with its media and tagged members. */
export async function findCard(
  db: DbExecutor,
  leagueId: string,
  cardId: string,
): Promise<CardDetailRow | null> {
  const rows = await db
    .select({
      ...cardColumns,
      capturedAt: media.capturedAt,
      isCaptureDateValidated: media.isCaptureDateValidated,
      createdAt: cards.createdAt,
    })
    .from(cards)
    .innerJoin(media, eq(media.id, cards.mediaId))
    .leftJoin(user, eq(user.id, cards.authorId))
    .where(and(eq(cards.id, cardId), eq(cards.leagueId, leagueId), eq(cards.status, 'active')))
    .limit(1)
  const row = rows[0]
  if (row === undefined) return null
  const tagged = await db
    .select({ userId: user.id, displayUsername: displayName })
    .from(cardTags)
    .innerJoin(user, eq(user.id, cardTags.userId))
    .where(inArray(cardTags.cardId, [cardId]))
    .orderBy(sql`lower(${displayName})`, user.id)
  return { ...row, tagged }
}
