import {
  cardCopies,
  cards,
  leagueMembers,
  media,
  portraits,
  user,
  type DbExecutor,
} from '@storix/db'
import { CARD_TIERS, mediaVariantsSchema, type CardTier } from '@storix/shared'
import { and, eq, inArray, sql } from 'drizzle-orm'
import type { CollectionCardBase } from '../cards/card-views'
import {
  authorIsFormerMember,
  authorMembership,
  authorMembershipOn,
} from '../cards/card-author.repository'
import { authorMomentStamp, readyMomentSelfieUploadId } from '../cards/card-moment'

export interface ProfileMember {
  leagueId: string
  userId: string
}

export interface ProfileHeaderRow {
  displayUsername: string
  joinedAt: Date
  avatarUploadId: string | null
  avatarColor: string | null
}

export interface ProfileStatsRow {
  photosPosted: number
  cardsOwned: number
  discoveries: number
  activeCards: number
  taggedCount: number
  bestTier: CardTier | null
}

const displayName = sql<string>`coalesce(${user.displayUsername}, ${user.username}, ${user.name})`

/** Finds a current member's display name, join date and avatar, or null when they are not a member. */
export async function findProfileHeader(
  db: DbExecutor,
  m: ProfileMember,
): Promise<ProfileHeaderRow | null> {
  const rows = await db
    .select({
      displayUsername: displayName,
      joinedAt: leagueMembers.joinedAt,
      avatarUploadId: portraits.uploadId,
      avatarColor: portraits.dominantColor,
    })
    .from(leagueMembers)
    .innerJoin(user, eq(user.id, leagueMembers.userId))
    .leftJoin(portraits, eq(portraits.userId, leagueMembers.userId))
    .where(and(eq(leagueMembers.leagueId, m.leagueId), eq(leagueMembers.userId, m.userId)))
    .limit(1)
  return rows[0] ?? null
}

/** Reads a member's profile counters and the best tier among the cards they own. */
export async function findProfileStats(db: DbExecutor, m: ProfileMember): Promise<ProfileStatsRow> {
  const result = await db.execute<Record<keyof ProfileStatsRow, unknown>>(sql`
    SELECT
      (SELECT count(*) FROM cards c
        WHERE c.league_id = ${m.leagueId} AND c.author_id = ${m.userId} AND c.status = 'active') AS "photosPosted",
      (SELECT count(DISTINCT cc.card_id) FROM card_copies cc
        JOIN cards c ON c.id = cc.card_id AND c.status = 'active'
        WHERE cc.league_id = ${m.leagueId} AND cc.owner_id = ${m.userId}) AS "cardsOwned",
      (SELECT count(*) FROM cards c
        WHERE c.league_id = ${m.leagueId} AND c.discovered_by_id = ${m.userId}) AS "discoveries",
      (SELECT count(*) FROM cards c
        WHERE c.league_id = ${m.leagueId} AND c.status = 'active') AS "activeCards",
      (SELECT count(*) FROM card_tags t
        JOIN cards c ON c.id = t.card_id AND c.status = 'active'
        WHERE c.league_id = ${m.leagueId} AND t.user_id = ${m.userId}) AS "taggedCount",
      (SELECT max(greatest(cc.tier_at_mint, cc.promoted_tier, c.tier))::text FROM card_copies cc
        JOIN cards c ON c.id = cc.card_id AND c.status = 'active'
        WHERE cc.league_id = ${m.leagueId} AND cc.owner_id = ${m.userId}) AS "bestTier"
  `)
  const row: Partial<Record<keyof ProfileStatsRow, unknown>> = result.rows[0] ?? {}
  return {
    photosPosted: Number(row.photosPosted ?? 0),
    cardsOwned: Number(row.cardsOwned ?? 0),
    discoveries: Number(row.discoveries ?? 0),
    activeCards: Number(row.activeCards ?? 0),
    taggedCount: Number(row.taggedCount ?? 0),
    bestTier: CARD_TIERS.find((tier) => tier === row.bestTier) ?? null,
  }
}

/** Lists the active cards a member owns, best first: display tier, foil copies, then number. */
export async function listOwnedCardsRanked(db: DbExecutor, m: ProfileMember): Promise<string[]> {
  const best = sql`max(greatest(${cardCopies.tierAtMint}, ${cardCopies.promotedTier}, ${cards.tier}))`
  const hasFoil = sql`bool_or(${cardCopies.variant} = 'foil')`
  const rows = await db
    .select({ cardId: cards.id })
    .from(cardCopies)
    .innerJoin(cards, and(eq(cards.id, cardCopies.cardId), eq(cards.status, 'active')))
    .where(and(eq(cardCopies.leagueId, m.leagueId), eq(cardCopies.ownerId, m.userId)))
    .groupBy(cards.id, cards.number)
    .orderBy(sql`${best} desc`, sql`${hasFoil} desc`, cards.number)
  return rows.map((row) => row.cardId)
}

/** Lists the base rows of the given cards of a league, in no particular order. */
export async function listCardBases(
  db: DbExecutor,
  input: { leagueId: string; cardIds: readonly string[] },
): Promise<CollectionCardBase[]> {
  if (input.cardIds.length === 0) return []
  const rows = await db
    .select({
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
      leagueId: cards.leagueId,
      momentSelfieUploadId: readyMomentSelfieUploadId,
      momentTakenAt: cards.momentTakenAt,
      momentLateMinutes: cards.momentLateMinutes,
      momentStamp: authorMomentStamp,
    })
    .from(cards)
    .innerJoin(media, eq(media.id, cards.mediaId))
    .leftJoin(user, eq(user.id, cards.authorId))
    .leftJoin(authorMembership, authorMembershipOn)
    .where(and(eq(cards.leagueId, input.leagueId), inArray(cards.id, [...input.cardIds])))
  return rows.map((row) => ({ ...row, variants: mediaVariantsSchema.parse(row.variants) }))
}
