import { cardCopies, cards, type DbExecutor } from '@storix/db'
import type { CardTier, CopyVariant, OwnedCopyState } from '@storix/shared'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'

export interface OwnedCopyRow {
  id: string
  cardId: string
  variant: CopyVariant
  tierAtMint: CardTier
  promotedTier: CardTier | null
}

export interface DeletedCopy {
  tierAtMint: CardTier
  promotedTier: CardTier | null
}

export interface InsertCopyRow {
  leagueId: string
  cardId: string
  ownerId: string
  variant: CopyVariant
  tierAtMint: CardTier
  source: 'booster' | 'craft'
  openingId: string | null
}

export interface CopyKeyInput {
  cardId: string
  ownerId: string
  variant: CopyVariant
}

function copyCondition(input: CopyKeyInput) {
  return and(
    eq(cardCopies.cardId, input.cardId),
    eq(cardCopies.ownerId, input.ownerId),
    eq(cardCopies.variant, input.variant),
  )
}

/** Lists the copies a member owns in a league, optionally restricted to some cards. */
export async function listOwnedCopies(
  db: DbExecutor,
  input: { leagueId: string; ownerId: string; cardIds?: readonly string[] },
): Promise<OwnedCopyRow[]> {
  if (input.cardIds !== undefined && input.cardIds.length === 0) return []
  return db
    .select({
      id: cardCopies.id,
      cardId: cardCopies.cardId,
      variant: cardCopies.variant,
      tierAtMint: cardCopies.tierAtMint,
      promotedTier: cardCopies.promotedTier,
    })
    .from(cardCopies)
    .where(
      and(
        eq(cardCopies.leagueId, input.leagueId),
        eq(cardCopies.ownerId, input.ownerId),
        input.cardIds === undefined ? undefined : inArray(cardCopies.cardId, [...input.cardIds]),
      ),
    )
}

/** Lists the variants of a card a member owns in a league, holding a share lock on those copies. */
export async function lockOwnedVariants(
  db: DbExecutor,
  input: { leagueId: string; cardId: string; ownerId: string },
): Promise<CopyVariant[]> {
  const rows = await db
    .select({ variant: cardCopies.variant })
    .from(cardCopies)
    .where(
      and(
        eq(cardCopies.leagueId, input.leagueId),
        eq(cardCopies.cardId, input.cardId),
        eq(cardCopies.ownerId, input.ownerId),
      ),
    )
    .for('share')
  return rows.map((row) => row.variant)
}

/** Lists the copies of a card a member owns in a league, holding an update lock on those copies. */
export async function lockOwnedCopies(
  db: DbExecutor,
  input: { leagueId: string; cardId: string; ownerId: string },
): Promise<OwnedCopyState[]> {
  return db
    .select({
      variant: cardCopies.variant,
      tierAtMint: cardCopies.tierAtMint,
      promotedTier: cardCopies.promotedTier,
    })
    .from(cardCopies)
    .where(
      and(
        eq(cardCopies.leagueId, input.leagueId),
        eq(cardCopies.cardId, input.cardId),
        eq(cardCopies.ownerId, input.ownerId),
      ),
    )
    .orderBy(asc(cardCopies.variant))
    .for('update')
}

/** Reads the league tier of an active card, holding a share lock on the card row; null when it is not active in the league. */
export async function lockCardTier(
  db: DbExecutor,
  input: { leagueId: string; cardId: string },
): Promise<CardTier | null> {
  const rows = await db
    .select({ tier: cards.tier })
    .from(cards)
    .where(
      and(
        eq(cards.id, input.cardId),
        eq(cards.leagueId, input.leagueId),
        eq(cards.status, 'active'),
      ),
    )
    .limit(1)
    .for('share')
  return rows[0]?.tier ?? null
}

/** Sets the personal tier of an owned copy; false when no such copy exists. */
export async function setPromotedTier(
  db: DbExecutor,
  input: CopyKeyInput & { promotedTier: CardTier; now: Date },
): Promise<boolean> {
  const { now } = input
  const rows = await db
    .update(cardCopies)
    .set({ promotedTier: input.promotedTier, promotedAt: now, updatedAt: now })
    .where(copyCondition(input))
    .returning({ id: cardCopies.id })
  return rows.length > 0
}

/** Inserts a new owned copy. */
export async function insertCopy(db: DbExecutor, row: InsertCopyRow): Promise<void> {
  await db.insert(cardCopies).values(row)
}

/** Raises the frozen tier of an owned copy and links it to the opening that upgraded it. */
export async function updateCopyTier(
  db: DbExecutor,
  input: CopyKeyInput & { tierAtMint: CardTier; openingId: string | null; now: Date },
): Promise<void> {
  await db
    .update(cardCopies)
    .set({
      tierAtMint: input.tierAtMint,
      openingId: input.openingId,
      promotedTier: null,
      promotedAt: null,
      updatedAt: input.now,
    })
    .where(copyCondition(input))
}

/** Deletes an owned copy and returns its tiers, or null when it was not owned. */
export async function deleteCopy(db: DbExecutor, input: CopyKeyInput): Promise<DeletedCopy | null> {
  const rows = await db
    .delete(cardCopies)
    .where(copyCondition(input))
    .returning({ tierAtMint: cardCopies.tierAtMint, promotedTier: cardCopies.promotedTier })
  return rows[0] ?? null
}

/** Switches the variant of an owned copy; false when no such copy exists. */
export async function updateCopyVariant(
  db: DbExecutor,
  input: { cardId: string; ownerId: string; from: CopyVariant; to: CopyVariant },
): Promise<boolean> {
  const rows = await db
    .update(cardCopies)
    .set({ variant: input.to, updatedAt: new Date() })
    .where(copyCondition({ cardId: input.cardId, ownerId: input.ownerId, variant: input.from }))
    .returning({ id: cardCopies.id })
  return rows.length > 0
}

/** Counts every copy of a card across the league. */
export async function countCardCopies(db: DbExecutor, cardId: string): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(cardCopies)
    .where(eq(cardCopies.cardId, cardId))
  return rows[0]?.total ?? 0
}
