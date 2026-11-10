import { cards, cardTags, media, user, type DbExecutor } from '@storix/db'
import { mediaVariantsSchema, type CardTier, type MediaVariant } from '@storix/shared'
import { and, desc, eq, sql } from 'drizzle-orm'
import {
  authorIsFormerMember,
  authorMembership,
  authorMembershipOn,
} from '../cards/card-author.repository'

export { lockLeagueEconomyExclusive, lockLeagueModeration } from '@storix/db'

export interface TaggedCardRow {
  id: string
  number: number
  title: string
  tier: CardTier
  status: 'active' | 'hidden'
  authorId: string | null
  authorName: string | null
  authorIsFormerMember: boolean
  thumbhash: string
  dominantColor: string
  width: number
  height: number
  variants: MediaVariant[]
  taggedAt: Date
}

export interface WithdrawableCardRow {
  id: string
  number: number
  status: 'active' | 'hidden'
  tier: CardTier
  authorId: string | null
}

/** Lists the league cards, active or hidden, the user is tagged in, newest first, with their media. */
export async function listTaggedCards(
  db: DbExecutor,
  input: { leagueId: string; userId: string },
): Promise<TaggedCardRow[]> {
  const rows = await db
    .select({
      id: cards.id,
      number: cards.number,
      title: cards.title,
      tier: cards.tier,
      status: cards.status,
      authorId: cards.authorId,
      authorName: sql<
        string | null
      >`coalesce(${user.displayUsername}, ${user.username}, ${user.name})`,
      authorIsFormerMember,
      thumbhash: media.thumbhash,
      dominantColor: media.dominantColor,
      width: media.width,
      height: media.height,
      variants: media.variants,
      taggedAt: cardTags.createdAt,
    })
    .from(cardTags)
    .innerJoin(cards, eq(cards.id, cardTags.cardId))
    .innerJoin(media, eq(media.id, cards.mediaId))
    .leftJoin(user, eq(user.id, cards.authorId))
    .leftJoin(authorMembership, authorMembershipOn)
    .where(and(eq(cardTags.userId, input.userId), eq(cards.leagueId, input.leagueId)))
    .orderBy(desc(cards.number))
  return rows.map((row) => ({ ...row, variants: mediaVariantsSchema.parse(row.variants) }))
}

/** Returns true when the user is tagged on the card. */
export async function isTagged(
  db: DbExecutor,
  input: { cardId: string; userId: string },
): Promise<boolean> {
  const rows = await db
    .select({ cardId: cardTags.cardId })
    .from(cardTags)
    .where(and(eq(cardTags.cardId, input.cardId), eq(cardTags.userId, input.userId)))
    .limit(1)
  return rows.length > 0
}

/** Finds a card of a league by id. */
export async function findWithdrawableCard(
  db: DbExecutor,
  input: { leagueId: string; cardId: string },
): Promise<WithdrawableCardRow | null> {
  const rows = await db
    .select({
      id: cards.id,
      number: cards.number,
      status: cards.status,
      tier: cards.tier,
      authorId: cards.authorId,
    })
    .from(cards)
    .where(and(eq(cards.id, input.cardId), eq(cards.leagueId, input.leagueId)))
    .limit(1)
  return rows[0] ?? null
}
