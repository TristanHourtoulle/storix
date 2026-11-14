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
import { and, count, eq, inArray, isNotNull, ne, sql } from 'drizzle-orm'

export interface StandingsPersonRow {
  userId: string
  displayUsername: string
  joinedAt: Date
  avatarUploadId: string | null
  avatarColor: string | null
  dust: number
  boostersOpened: number
}

export interface OwnedTierRow {
  ownerId: string
  tier: CardTier
  cards: number
  weekCards: number
}

export interface CopiesRow {
  ownerId: string
  copies: number
  foils: number
  bestFoilTier: CardTier | null
}

export interface UserCountRow {
  userId: string
  value: number
}

export interface AuditCountsRow {
  userId: string
  promotions: number
  recycled: number
}

export interface PullCountsRow {
  userId: string
  discoveries: number
  mythicPulls: number
}

const asNumber = (value: unknown): number => Number(value ?? 0)

/** Current members with their name, join date, avatar and wallet. */
export function listStandingsPeople(
  db: DbExecutor,
  leagueId: string,
): Promise<StandingsPersonRow[]> {
  return db
    .select({
      userId: leagueMembers.userId,
      displayUsername: sql<string>`coalesce(${user.displayUsername}, ${user.username}, ${user.name})`,
      joinedAt: leagueMembers.joinedAt,
      avatarUploadId: portraits.uploadId,
      avatarColor: portraits.dominantColor,
      dust: sql<number>`coalesce(${memberWallets.dust}, 0)`.mapWith(Number),
      boostersOpened: sql<number>`coalesce(${memberWallets.boostersOpened}, 0)`.mapWith(Number),
    })
    .from(leagueMembers)
    .innerJoin(user, eq(user.id, leagueMembers.userId))
    .leftJoin(portraits, eq(portraits.userId, leagueMembers.userId))
    .leftJoin(
      memberWallets,
      and(
        eq(memberWallets.leagueId, leagueMembers.leagueId),
        eq(memberWallets.userId, leagueMembers.userId),
      ),
    )
    .where(eq(leagueMembers.leagueId, leagueId))
}

/** Active cards of the league, the denominator of "% de la ligue". */
export async function countLeagueCards(db: DbExecutor, leagueId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(cards)
    .where(and(eq(cards.leagueId, leagueId), eq(cards.status, 'active')))
  return asNumber(row?.value)
}

/**
 * Distinct cards owned per member and current tier (the card's tier, or a higher promoted one),
 * with how many were first acquired since `weekStart`.
 */
export async function listOwnedTiers(
  db: DbExecutor,
  leagueId: string,
  weekStart: Date,
): Promise<OwnedTierRow[]> {
  const owned = db
    .select({
      ownerId: cardCopies.ownerId,
      tier: sql<CardTier>`greatest(${cards.tier}, max(${cardCopies.promotedTier}))`.as('tier'),
      firstAt: sql<Date>`min(${cardCopies.createdAt})`.as('first_at'),
    })
    .from(cardCopies)
    .innerJoin(cards, eq(cards.id, cardCopies.cardId))
    .where(eq(cardCopies.leagueId, leagueId))
    .groupBy(cardCopies.ownerId, cardCopies.cardId, cards.tier)
    .as('owned')
  const rows = await db
    .select({
      ownerId: owned.ownerId,
      tier: owned.tier,
      cards: count(),
      weekCards:
        sql<number>`count(*) filter (where ${owned.firstAt} >= ${weekStart.toISOString()})`.mapWith(
          Number,
        ),
    })
    .from(owned)
    .groupBy(owned.ownerId, owned.tier)
  return rows.map((row) => ({ ...row, cards: asNumber(row.cards) }))
}

/** Copies per member (owned copies plus stacked duplicates), foil copies and the best foil tier. */
export async function listCopies(db: DbExecutor, leagueId: string): Promise<CopiesRow[]> {
  const [copies, stacks] = await Promise.all([
    db
      .select({
        ownerId: cardCopies.ownerId,
        copies: count(),
        foils: sql<number>`count(*) filter (where ${cardCopies.variant} = 'foil')`.mapWith(Number),
        bestFoilTier: sql<CardTier | null>`max(greatest(${cards.tier}, ${cardCopies.promotedTier})) filter (where ${cardCopies.variant} = 'foil')`,
      })
      .from(cardCopies)
      .innerJoin(cards, eq(cards.id, cardCopies.cardId))
      .where(eq(cardCopies.leagueId, leagueId))
      .groupBy(cardCopies.ownerId),
    db
      .select({
        ownerId: cardCopyStacks.ownerId,
        stacked: sql<number>`coalesce(sum(${cardCopyStacks.count}), 0)`.mapWith(Number),
      })
      .from(cardCopyStacks)
      .where(eq(cardCopyStacks.leagueId, leagueId))
      .groupBy(cardCopyStacks.ownerId),
  ])
  const stacked = new Map(stacks.map((row) => [row.ownerId, row.stacked]))
  return copies.map((row) => ({
    ownerId: row.ownerId,
    copies: asNumber(row.copies) + (stacked.get(row.ownerId) ?? 0),
    foils: row.foils,
    bestFoilTier: row.bestFoilTier,
  }))
}

/** Active cards authored per member. */
export async function listAuthoredPhotos(
  db: DbExecutor,
  leagueId: string,
): Promise<UserCountRow[]> {
  const rows = await db
    .select({ userId: sql<string>`${cards.authorId}`, value: count() })
    .from(cards)
    .where(and(eq(cards.leagueId, leagueId), eq(cards.status, 'active'), isNotNull(cards.authorId)))
    .groupBy(cards.authorId)
  return rows.map((row) => ({ userId: row.userId, value: asNumber(row.value) }))
}

/** Reactions other people left on each author's active cards. */
export async function listReactionsReceived(
  db: DbExecutor,
  leagueId: string,
): Promise<UserCountRow[]> {
  const rows = await db
    .select({ userId: sql<string>`${cards.authorId}`, value: count() })
    .from(reactions)
    .innerJoin(cards, eq(cards.id, reactions.cardId))
    .where(
      and(
        eq(cards.leagueId, leagueId),
        eq(cards.status, 'active'),
        isNotNull(cards.authorId),
        ne(reactions.userId, sql`${cards.authorId}`),
      ),
    )
    .groupBy(cards.authorId)
  return rows.map((row) => ({ userId: row.userId, value: asNumber(row.value) }))
}

/** Copies of each author's photos held by other members. */
export async function listMuseCopies(db: DbExecutor, leagueId: string): Promise<UserCountRow[]> {
  const rows = await db
    .select({ userId: sql<string>`${cards.authorId}`, value: count() })
    .from(cardCopies)
    .innerJoin(cards, eq(cards.id, cardCopies.cardId))
    .where(
      and(
        eq(cardCopies.leagueId, leagueId),
        isNotNull(cards.authorId),
        ne(cardCopies.ownerId, sql`${cards.authorId}`),
      ),
    )
    .groupBy(cards.authorId)
  return rows.map((row) => ({ userId: row.userId, value: asNumber(row.value) }))
}

/** Rarity upgrades and recycled duplicates (single copies plus converted stack quantities). */
export async function listAuditCounts(db: DbExecutor, leagueId: string): Promise<AuditCountsRow[]> {
  const rows = await db
    .select({
      userId: sql<string>`${auditLog.actorId}`,
      promotions: sql<number>`count(*) filter (where ${auditLog.action} = 'copy.promoted')`.mapWith(
        Number,
      ),
      recycled:
        sql<number>`count(*) filter (where ${auditLog.action} = 'copy.recycled') + coalesce(sum((${auditLog.metadata}->>'quantity')::int) filter (where ${auditLog.action} = 'stack.converted'), 0)`.mapWith(
          Number,
        ),
    })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.leagueId, leagueId),
        isNotNull(auditLog.actorId),
        inArray(auditLog.action, ['copy.promoted', 'copy.recycled', 'stack.converted']),
      ),
    )
    .groupBy(auditLog.actorId)
  return rows
}

/** Discoveries and mythic pulls per member, from booster history. */
export function listPullCounts(db: DbExecutor, leagueId: string): Promise<PullCountsRow[]> {
  return db
    .select({
      userId: boosterOpenings.userId,
      discoveries: sql<number>`count(*) filter (where ${boosterPulls.isDiscovery})`.mapWith(Number),
      mythicPulls:
        sql<number>`count(*) filter (where ${boosterPulls.rolledTier} = 'mythic')`.mapWith(Number),
    })
    .from(boosterPulls)
    .innerJoin(boosterOpenings, eq(boosterOpenings.id, boosterPulls.openingId))
    .where(eq(boosterOpenings.leagueId, leagueId))
    .groupBy(boosterOpenings.userId)
}

/** Moments posted on time per member. */
export async function listOnTimeMoments(db: DbExecutor, leagueId: string): Promise<UserCountRow[]> {
  const rows = await db
    .select({ userId: momentPosts.userId, value: count() })
    .from(momentPosts)
    .where(and(eq(momentPosts.leagueId, leagueId), eq(momentPosts.lateMinutes, 0)))
    .groupBy(momentPosts.userId)
  return rows.map((row) => ({ userId: row.userId, value: asNumber(row.value) }))
}

/** Claimed missions per member. */
export async function listClaimedMissions(
  db: DbExecutor,
  leagueId: string,
): Promise<UserCountRow[]> {
  const rows = await db
    .select({ userId: memberMissions.userId, value: count() })
    .from(memberMissions)
    .where(and(eq(memberMissions.leagueId, leagueId), isNotNull(memberMissions.claimedAt)))
    .groupBy(memberMissions.userId)
  return rows.map((row) => ({ userId: row.userId, value: asNumber(row.value) }))
}

/** Paillettes spent in the shop from this league, per member. */
export function listShopSpent(db: DbExecutor, leagueId: string): Promise<UserCountRow[]> {
  return db
    .select({
      userId: cosmeticPurchases.userId,
      value: sql<number>`coalesce(sum(${cosmeticPurchases.price}), 0)`.mapWith(Number),
    })
    .from(cosmeticPurchases)
    .where(eq(cosmeticPurchases.leagueId, leagueId))
    .groupBy(cosmeticPurchases.userId)
}
