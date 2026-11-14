import {
  auditLog,
  boosterOpenings,
  boosterPulls,
  cardCopies,
  cardCopyStacks,
  cards,
  cosmeticPurchases,
  leagueMembers,
  memberMissions,
  memberWallets,
  momentPosts,
  portraits,
  reactions,
  user,
  type DbExecutor,
} from '@storix/db'
import type { CardTier } from '@storix/shared'
import { and, count, eq, isNotNull, sql } from 'drizzle-orm'

export interface StandingsPersonRow {
  userId: string
  displayUsername: string
  joinedAt: Date
  avatarUploadId: string | null
  avatarColor: string | null
  dust: number
  boostersOpened: number
  promotions: number
  recycled: number
  discoveries: number
  mythicPulls: number
  onTimeMoments: number
  missions: number
  shopSpent: number
}

export interface OwnedTierRow {
  ownerId: string
  tier: CardTier
  cards: number
  weekCards: number
  copies: number
  foils: number
  bestFoilTier: CardTier | null
}

export interface StackedRow {
  ownerId: string
  stacked: number
}

export interface AuthoredRow {
  userId: string
  photos: number
  reactionsReceived: number
  muse: number
}

const asNumber = (value: unknown): number => Number(value ?? 0)

/** The tier a copy's owner sees, as in `shownCopyTier`: mint tier, or for a promoted copy never below the league tier. */
const shownTier = sql`case when ${cardCopies.promotedTier} is null then ${cardCopies.tierAtMint} else greatest(${cardCopies.promotedTier}, ${cards.tier}, ${cardCopies.tierAtMint}) end`

const activeCard = eq(cards.status, 'active')

/** `cards` columns qualified explicitly, for subqueries correlated to a single-table outer query. */
const outerCardId = sql`${sql.identifier('cards')}.${sql.identifier('id')}`
const outerAuthorId = sql`${sql.identifier('cards')}.${sql.identifier('author_id')}`

const memberCount = (expression: ReturnType<typeof sql>) =>
  sql<number>`coalesce((${expression}), 0)`.mapWith(Number)

/**
 * Current members with their name, join date, avatar, wallet and the per-member counters
 * (rarity upgrades, recycles, discoveries, mythic pulls, on-time Moments, missions, shop spend).
 */
export function listStandingsPeople(
  db: DbExecutor,
  leagueId: string,
): Promise<StandingsPersonRow[]> {
  const member = leagueMembers.userId
  return db
    .select({
      userId: member,
      displayUsername: sql<string>`coalesce(${user.displayUsername}, ${user.username}, ${user.name})`,
      joinedAt: leagueMembers.joinedAt,
      avatarUploadId: portraits.uploadId,
      avatarColor: portraits.dominantColor,
      dust: sql<number>`coalesce(${memberWallets.dust}, 0)`.mapWith(Number),
      boostersOpened: sql<number>`coalesce(${memberWallets.boostersOpened}, 0)`.mapWith(Number),
      promotions: memberCount(
        sql`select count(*) from ${auditLog} where ${auditLog.leagueId} = ${leagueId} and ${auditLog.actorId} = ${member} and ${auditLog.action} = 'copy.promoted'`,
      ),
      recycled: memberCount(
        sql`select count(*) filter (where ${auditLog.action} = 'copy.recycled') + coalesce(sum((${auditLog.metadata}->>'quantity')::int) filter (where ${auditLog.action} = 'stack.converted'), 0) from ${auditLog} where ${auditLog.leagueId} = ${leagueId} and ${auditLog.actorId} = ${member} and ${auditLog.action} in ('copy.recycled', 'stack.converted')`,
      ),
      discoveries: memberCount(
        sql`select count(*) from ${boosterPulls} join ${boosterOpenings} on ${boosterOpenings.id} = ${boosterPulls.openingId} where ${boosterOpenings.leagueId} = ${leagueId} and ${boosterOpenings.userId} = ${member} and ${boosterPulls.isDiscovery}`,
      ),
      mythicPulls: memberCount(
        sql`select count(*) from ${boosterPulls} join ${boosterOpenings} on ${boosterOpenings.id} = ${boosterPulls.openingId} where ${boosterOpenings.leagueId} = ${leagueId} and ${boosterOpenings.userId} = ${member} and ${boosterPulls.tierAtMint} = 'mythic'`,
      ),
      onTimeMoments: memberCount(
        sql`select count(*) from ${momentPosts} where ${momentPosts.leagueId} = ${leagueId} and ${momentPosts.userId} = ${member} and ${momentPosts.lateMinutes} = 0`,
      ),
      missions: memberCount(
        sql`select count(*) from ${memberMissions} where ${memberMissions.leagueId} = ${leagueId} and ${memberMissions.userId} = ${member} and ${memberMissions.claimedAt} is not null`,
      ),
      shopSpent: memberCount(
        sql`select sum(${cosmeticPurchases.price}) from ${cosmeticPurchases} where ${cosmeticPurchases.leagueId} = ${leagueId} and ${cosmeticPurchases.userId} = ${member}`,
      ),
    })
    .from(leagueMembers)
    .innerJoin(user, eq(user.id, member))
    .leftJoin(portraits, eq(portraits.userId, member))
    .leftJoin(
      memberWallets,
      and(eq(memberWallets.leagueId, leagueMembers.leagueId), eq(memberWallets.userId, member)),
    )
    .where(eq(leagueMembers.leagueId, leagueId))
}

/** Active cards of the league, the denominator of "% de la ligue". */
export async function countLeagueCards(db: DbExecutor, leagueId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(cards)
    .where(and(eq(cards.leagueId, leagueId), activeCard))
  return asNumber(row?.value)
}

/**
 * Owned active cards per member and shown tier (the best of the member's copies), with how many
 * were first acquired since `weekStart`, the copies held, the foils and the best foil tier.
 */
export async function listOwnedTiers(
  db: DbExecutor,
  leagueId: string,
  weekStart: Date,
): Promise<OwnedTierRow[]> {
  const owned = db
    .select({
      ownerId: cardCopies.ownerId,
      tier: sql<CardTier>`max(${shownTier})`.as('tier'),
      firstAt: sql<Date>`min(${cardCopies.createdAt})`.as('first_at'),
      copies: sql<number>`count(*)`.as('copies'),
      foils: sql<number>`count(*) filter (where ${cardCopies.variant} = 'foil')`.as('foils'),
      foilTier:
        sql<CardTier | null>`max(${shownTier}) filter (where ${cardCopies.variant} = 'foil')`.as(
          'foil_tier',
        ),
    })
    .from(cardCopies)
    .innerJoin(cards, eq(cards.id, cardCopies.cardId))
    .where(and(eq(cardCopies.leagueId, leagueId), activeCard))
    .groupBy(cardCopies.ownerId, cardCopies.cardId)
    .as('owned')
  return db
    .select({
      ownerId: owned.ownerId,
      tier: owned.tier,
      cards: sql<number>`count(*)`.mapWith(Number),
      weekCards:
        sql<number>`count(*) filter (where ${owned.firstAt} >= ${weekStart.toISOString()})`.mapWith(
          Number,
        ),
      copies: sql<number>`sum(${owned.copies})`.mapWith(Number),
      foils: sql<number>`sum(${owned.foils})`.mapWith(Number),
      bestFoilTier: sql<CardTier | null>`max(${owned.foilTier})`,
    })
    .from(owned)
    .groupBy(owned.ownerId, owned.tier)
}

/** Stacked duplicates of active cards per member. */
export function listStacked(db: DbExecutor, leagueId: string): Promise<StackedRow[]> {
  return db
    .select({
      ownerId: cardCopyStacks.ownerId,
      stacked: sql<number>`coalesce(sum(${cardCopyStacks.count}), 0)`.mapWith(Number),
    })
    .from(cardCopyStacks)
    .innerJoin(cards, eq(cards.id, cardCopyStacks.cardId))
    .where(and(eq(cardCopyStacks.leagueId, leagueId), activeCard))
    .groupBy(cardCopyStacks.ownerId)
}

/**
 * Per author: active photos, reactions others left on them, and the copies of them other members
 * hold (owned copies plus stacked duplicates).
 */
export function listAuthored(db: DbExecutor, leagueId: string): Promise<AuthoredRow[]> {
  return db
    .select({
      userId: sql<string>`${cards.authorId}`,
      photos: sql<number>`count(*)`.mapWith(Number),
      reactionsReceived:
        sql<number>`coalesce(sum((select count(*) from ${reactions} where ${reactions.cardId} = ${outerCardId} and ${reactions.userId} <> ${outerAuthorId})), 0)`.mapWith(
          Number,
        ),
      muse: sql<number>`coalesce(sum((select count(*) from ${cardCopies} where ${cardCopies.cardId} = ${outerCardId} and ${cardCopies.ownerId} <> ${outerAuthorId}) + (select coalesce(sum(${cardCopyStacks.count}), 0) from ${cardCopyStacks} where ${cardCopyStacks.cardId} = ${outerCardId} and ${cardCopyStacks.ownerId} <> ${outerAuthorId})), 0)`.mapWith(
        Number,
      ),
    })
    .from(cards)
    .where(and(eq(cards.leagueId, leagueId), activeCard, isNotNull(cards.authorId)))
    .groupBy(cards.authorId)
}
