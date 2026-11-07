import { boosterOpenings, boosterPulls, cards, media, user, type DbExecutor } from '@storix/db'
import {
  mediaVariantsSchema,
  type CardTier,
  type CopyVariant,
  type MediaVariant,
  type PityState,
  type PoolCard,
  type PulledCopyOutcome,
} from '@storix/shared'
import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

export interface BoosterPoolCard extends PoolCard {
  leagueId: string
}

export interface OpeningRecord {
  id: string
  openedAt: Date
  dustGained: number
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
}

export interface InsertPullRow {
  slot: number
  cardId: string
  rolledTier: CardTier
  tierAtMint: CardTier
  variant: CopyVariant
  outcome: PulledCopyOutcome
  dust: number
  isFirstCopy: boolean
  isDiscovery: boolean
}

interface CardMediaColumns {
  cardId: string
  number: number
  title: string
  authorId: string | null
  authorName: string | null
  thumbhash: string
  dominantColor: string
  width: number
  height: number
  variants: MediaVariant[]
}

export interface PullViewRow extends CardMediaColumns {
  slot: number
  rolledTier: CardTier
  tierAtMint: CardTier
  variant: CopyVariant
  outcome: PulledCopyOutcome
  dust: number
  isFirstCopy: boolean
  isDiscovery: boolean
  capturedAt: Date | null
}

export interface RevealRow extends CardMediaColumns {
  pulledById: string
  pulledByName: string | null
  pulledAt: Date
  variant: CopyVariant
  tierAtMint: CardTier
  tier: CardTier
  isProvisional: boolean
}

const author = alias(user, 'author')
const puller = alias(user, 'puller')

const authorName = sql<
  string | null
>`coalesce(${author.displayUsername}, ${author.username}, ${author.name})`
const pullerName = sql<
  string | null
>`coalesce(${puller.displayUsername}, ${puller.username}, ${puller.name})`

const cardMediaColumns = {
  cardId: cards.id,
  number: cards.number,
  title: cards.title,
  authorId: cards.authorId,
  authorName,
  thumbhash: media.thumbhash,
  dominantColor: media.dominantColor,
  width: media.width,
  height: media.height,
  variants: media.variants,
}

function parseVariants<T extends { variants: unknown }>(
  row: T,
): Omit<T, 'variants'> & { variants: MediaVariant[] } {
  return { ...row, variants: mediaVariantsSchema.parse(row.variants) }
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
    .where(
      and(
        eq(cards.leagueId, input.leagueId),
        eq(cards.status, 'active'),
        lte(cards.createdAt, input.eligibleBefore),
      ),
    )
    .orderBy(asc(cards.number))
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
): Promise<{ id: string; openedAt: Date }> {
  const rows = await db
    .insert(boosterOpenings)
    .values(row)
    .returning({ id: boosterOpenings.id, openedAt: boosterOpenings.openedAt })
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

/** Lists the pulls of an opening by slot with their card and media, skipping pulls whose card was deleted. */
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
      isFirstCopy: boosterPulls.isFirstCopy,
      isDiscovery: boosterPulls.isDiscovery,
      capturedAt: media.capturedAt,
    })
    .from(boosterPulls)
    .innerJoin(cards, eq(cards.id, boosterPulls.cardId))
    .innerJoin(media, eq(media.id, cards.mediaId))
    .leftJoin(author, eq(author.id, cards.authorId))
    .where(eq(boosterPulls.openingId, openingId))
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

/** Lists the league's latest Rare-or-better pulls since a date, newest first. */
export async function listRecentReveals(
  db: DbExecutor,
  input: { leagueId: string; since: Date; limit: number },
): Promise<RevealRow[]> {
  const rows = await db
    .select({
      ...cardMediaColumns,
      pulledById: boosterOpenings.userId,
      pulledByName: pullerName,
      pulledAt: boosterOpenings.openedAt,
      variant: boosterPulls.variant,
      tierAtMint: boosterPulls.tierAtMint,
      tier: cards.tier,
      isProvisional: cards.isProvisional,
    })
    .from(boosterPulls)
    .innerJoin(boosterOpenings, eq(boosterOpenings.id, boosterPulls.openingId))
    .innerJoin(cards, eq(cards.id, boosterPulls.cardId))
    .innerJoin(media, eq(media.id, cards.mediaId))
    .leftJoin(author, eq(author.id, cards.authorId))
    .leftJoin(puller, eq(puller.id, boosterOpenings.userId))
    .where(
      and(
        eq(boosterOpenings.leagueId, input.leagueId),
        gte(boosterOpenings.openedAt, input.since),
        gte(boosterPulls.tierAtMint, 'rare'),
        eq(cards.status, 'active'),
      ),
    )
    .orderBy(desc(boosterOpenings.openedAt), asc(boosterPulls.slot))
    .limit(input.limit)
  return rows.map(parseVariants)
}
