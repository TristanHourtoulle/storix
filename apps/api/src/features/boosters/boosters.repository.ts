import {
  boosterOpenings,
  boosterPulls,
  cardCopies,
  cards,
  media,
  user,
  type DbExecutor,
} from '@storix/db'
import {
  mediaVariantsSchema,
  type CardTier,
  type CopyVariant,
  type MediaVariant,
  type BoosterSource,
  type PityState,
  type PoolCard,
  type PulledCopyOutcome,
} from '@storix/shared'
import { and, asc, eq, exists, gt, inArray, isNull, lte, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import {
  authorIsFormerMember,
  authorMembership,
  authorMembershipOn,
} from '../cards/card-author.repository'
import { authorMomentStamp, readyMomentSelfieUploadId } from '../cards/card-moment'

export interface BoosterPoolCard extends PoolCard {
  leagueId: string
}

export interface PoolAvailabilityRow {
  drawableCount: number
  hasEpicOrBetter: boolean
  hasLegendaryOrBetter: boolean
  nextCreatedAt: Date | null
}

export interface OpeningRecord {
  id: string
  openedAt: Date
  dustGained: number
  isPremium: boolean
}

export interface InsertOpeningRow {
  leagueId: string
  userId: string
  requestId: string
  seed: string
  tableVersion: number
  pityBefore: PityState
  poolDigest: string
  dustGained: number
  isPremium: boolean
  source: BoosterSource
}

export interface InsertPullRow {
  slot: number
  cardId: string
  rolledTier: CardTier
  tierAtMint: CardTier
  variant: CopyVariant
  outcome: PulledCopyOutcome
  dust: number
  stackCount: number | null
  isFirstCopy: boolean
  isDiscovery: boolean
}

interface CardMediaColumns {
  cardId: string
  number: number
  title: string
  authorId: string | null
  authorName: string | null
  authorIsFormerMember: boolean
  thumbhash: string
  dominantColor: string
  width: number
  height: number
  variants: MediaVariant[]
  leagueId: string
  momentSelfieUploadId: string | null
  momentTakenAt: Date | null
  momentLateMinutes: number | null
  momentStamp: string | null
}

export interface PullViewRow extends CardMediaColumns {
  slot: number
  rolledTier: CardTier
  tierAtMint: CardTier
  variant: CopyVariant
  outcome: PulledCopyOutcome
  dust: number
  stackCount: number | null
  isFirstCopy: boolean
  isDiscovery: boolean
  capturedAt: Date | null
}

const author = alias(user, 'author')

const authorName = sql<
  string | null
>`coalesce(${author.displayUsername}, ${author.username}, ${author.name})`

const cardMediaColumns = {
  cardId: cards.id,
  number: cards.number,
  title: cards.title,
  authorId: cards.authorId,
  authorName,
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
}

function parseVariants<T extends { variants: unknown }>(
  row: T,
): Omit<T, 'variants'> & { variants: MediaVariant[] } {
  return { ...row, variants: mediaVariantsSchema.parse(row.variants) }
}

function activeLeagueCards(leagueId: string) {
  return and(eq(cards.leagueId, leagueId), eq(cards.status, 'active'))
}

function isDrawable(eligibleBefore: Date) {
  return lte(cards.createdAt, eligibleBefore)
}

/** Lists the active cards of a league created at or before `eligibleBefore`, by number. */
export async function listBoosterPool(
  db: DbExecutor,
  input: { leagueId: string; eligibleBefore: Date },
): Promise<BoosterPoolCard[]> {
  return db
    .select({
      cardId: cards.id,
      leagueId: cards.leagueId,
      authorId: cards.authorId,
      number: cards.number,
      tier: cards.tier,
    })
    .from(cards)
    .where(and(activeLeagueCards(input.leagueId), isDrawable(input.eligibleBefore)))
    .orderBy(asc(cards.number))
}

/** Aggregates the booster pool over the same predicate as `listBoosterPool`, with the next card to enter it. */
export async function findPoolAvailability(
  db: DbExecutor,
  input: { leagueId: string; eligibleBefore: Date },
): Promise<PoolAvailabilityRow> {
  const drawable = isDrawable(input.eligibleBefore)
  const rows = await db
    .select({
      drawableCount: sql<number>`count(*) filter (where ${drawable})`.mapWith(Number),
      hasEpicOrBetter: sql<boolean>`count(*) filter (where ${drawable} and ${cards.tier} >= 'epic') > 0`,
      hasLegendaryOrBetter: sql<boolean>`count(*) filter (where ${drawable} and ${cards.tier} >= 'legendary') > 0`,
      nextCreatedAt:
        sql<Date | null>`min(${cards.createdAt}) filter (where ${gt(cards.createdAt, input.eligibleBefore)})`.mapWith(
          cards.createdAt,
        ),
    })
    .from(cards)
    .where(activeLeagueCards(input.leagueId))
  const row = rows[0]
  return {
    drawableCount: row?.drawableCount ?? 0,
    hasEpicOrBetter: row?.hasEpicOrBetter ?? false,
    hasLegendaryOrBetter: row?.hasLegendaryOrBetter ?? false,
    nextCreatedAt: row?.nextCreatedAt ?? null,
  }
}

/** Finds the opening a member already made with this client request id. */
export async function findOpeningByRequest(
  db: DbExecutor,
  input: { leagueId: string; userId: string; requestId: string },
): Promise<OpeningRecord | null> {
  const rows = await db
    .select({
      id: boosterOpenings.id,
      openedAt: boosterOpenings.openedAt,
      dustGained: boosterOpenings.dustGained,
      isPremium: boosterOpenings.isPremium,
    })
    .from(boosterOpenings)
    .where(
      and(
        eq(boosterOpenings.leagueId, input.leagueId),
        eq(boosterOpenings.userId, input.userId),
        eq(boosterOpenings.requestId, input.requestId),
      ),
    )
    .limit(1)
  return rows[0] ?? null
}

/** Records a booster opening with its replay audit data. */
export async function insertOpening(
  db: DbExecutor,
  row: InsertOpeningRow,
): Promise<{ id: string; openedAt: Date; isPremium: boolean }> {
  const rows = await db.insert(boosterOpenings).values(row).returning({
    id: boosterOpenings.id,
    openedAt: boosterOpenings.openedAt,
    isPremium: boosterOpenings.isPremium,
  })
  const inserted = rows[0]
  if (inserted === undefined) throw new Error('Booster opening insert returned no row')
  return inserted
}

/** Records the pulls of an opening, one row per slot. */
export async function insertPulls(
  db: DbExecutor,
  openingId: string,
  rows: readonly InsertPullRow[],
): Promise<void> {
  if (rows.length === 0) return
  await db.insert(boosterPulls).values(rows.map((row) => ({ ...row, openingId })))
}

/**
 * Lists the pulls of an opening by slot with their card and media, skipping pulls whose card was deleted,
 * is no longer active, or of which the opener no longer owns any copy.
 */
export async function listOpeningPulls(db: DbExecutor, openingId: string): Promise<PullViewRow[]> {
  const rows = await db
    .select({
      ...cardMediaColumns,
      slot: boosterPulls.slot,
      rolledTier: boosterPulls.rolledTier,
      tierAtMint: boosterPulls.tierAtMint,
      variant: boosterPulls.variant,
      outcome: boosterPulls.outcome,
      dust: boosterPulls.dust,
      stackCount: boosterPulls.stackCount,
      isFirstCopy: boosterPulls.isFirstCopy,
      isDiscovery: boosterPulls.isDiscovery,
      capturedAt: media.capturedAt,
    })
    .from(boosterPulls)
    .innerJoin(boosterOpenings, eq(boosterOpenings.id, boosterPulls.openingId))
    .innerJoin(cards, eq(cards.id, boosterPulls.cardId))
    .innerJoin(media, eq(media.id, cards.mediaId))
    .leftJoin(author, eq(author.id, cards.authorId))
    .leftJoin(authorMembership, authorMembershipOn)
    .where(
      and(
        eq(boosterPulls.openingId, openingId),
        eq(cards.status, 'active'),
        exists(
          db
            .select({ one: sql`1` })
            .from(cardCopies)
            .where(
              and(
                eq(cardCopies.cardId, boosterPulls.cardId),
                eq(cardCopies.ownerId, boosterOpenings.userId),
              ),
            ),
        ),
      ),
    )
    .orderBy(asc(boosterPulls.slot))
  return rows.map(parseVariants)
}

/** Claims discovery of the undiscovered, non-authored cards for the member, locking rows by id. */
export async function claimDiscoveries(
  db: DbExecutor,
  input: { cardIds: readonly string[]; userId: string; now: Date },
): Promise<string[]> {
  if (input.cardIds.length === 0) return []
  const claimable = and(
    inArray(cards.id, [...input.cardIds]),
    isNull(cards.discoveredAt),
    sql`${cards.authorId} IS DISTINCT FROM ${input.userId}`,
  )
  const locked = await db
    .select({ id: cards.id })
    .from(cards)
    .where(claimable)
    .orderBy(asc(cards.id))
    .for('update')
  if (locked.length === 0) return []
  const rows = await db
    .update(cards)
    .set({ discoveredById: input.userId, discoveredAt: input.now })
    .where(
      and(
        claimable,
        inArray(
          cards.id,
          locked.map((row) => row.id),
        ),
      ),
    )
    .returning({ id: cards.id })
  return rows.map((row) => row.id)
}
