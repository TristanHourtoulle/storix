import { cardCopies, cardCopyStacks, user, type DbExecutor } from '@storix/db'
import type {
  CardTier,
  CopyVariant,
  OwnedCopyState,
  RemovedStack,
  StackEntry,
} from '@storix/shared'
import { and, asc, eq, gt, inArray, isNotNull, ne, sql } from 'drizzle-orm'

export interface StackKey {
  leagueId: string
  cardId: string
  ownerId: string
}

export interface CardStackEntry extends StackEntry {
  cardId: string
}

export type StackRowInput = StackKey & { variant: CopyVariant; tierAtMint: CardTier; count: number }

export interface PromotedHolderRow {
  ownerId: string
  displayUsername: string | null
  copy: OwnedCopyState
}

const stackColumns = {
  variant: cardCopyStacks.variant,
  tierAtMint: cardCopyStacks.tierAtMint,
  count: cardCopyStacks.count,
}

function keyCondition(key: StackKey) {
  return and(
    eq(cardCopyStacks.leagueId, key.leagueId),
    eq(cardCopyStacks.cardId, key.cardId),
    eq(cardCopyStacks.ownerId, key.ownerId),
  )
}

function entryCondition(key: StackKey & Omit<StackEntry, 'count'>) {
  return and(
    keyCondition(key),
    eq(cardCopyStacks.variant, key.variant),
    eq(cardCopyStacks.tierAtMint, key.tierAtMint),
  )
}

/** Lists a member's stacked copies of some cards in a league. */
export async function listStackEntries(
  db: DbExecutor,
  input: { leagueId: string; ownerId: string; cardIds: readonly string[] },
): Promise<CardStackEntry[]> {
  if (input.cardIds.length === 0) return []
  return db
    .select({ cardId: cardCopyStacks.cardId, ...stackColumns })
    .from(cardCopyStacks)
    .where(
      and(
        eq(cardCopyStacks.leagueId, input.leagueId),
        eq(cardCopyStacks.ownerId, input.ownerId),
        inArray(cardCopyStacks.cardId, [...input.cardIds]),
      ),
    )
    .orderBy(
      asc(cardCopyStacks.cardId),
      asc(cardCopyStacks.variant),
      asc(cardCopyStacks.tierAtMint),
    )
}

/** Lists a member's stacked copies of one card, holding an update lock on those rows. */
export async function lockStackEntries(db: DbExecutor, key: StackKey): Promise<StackEntry[]> {
  return db
    .select(stackColumns)
    .from(cardCopyStacks)
    .where(keyCondition(key))
    .orderBy(asc(cardCopyStacks.variant), asc(cardCopyStacks.tierAtMint))
    .for('update')
}

function mergeRows(rows: readonly StackRowInput[]): StackRowInput[] {
  const keyOf = (row: StackRowInput) =>
    [row.leagueId, row.cardId, row.ownerId, row.variant, row.tierAtMint].join(':')
  const merged = rows.reduce<ReadonlyMap<string, StackRowInput>>((acc, row) => {
    const current = acc.get(keyOf(row))
    const next = current === undefined ? row : { ...current, count: current.count + row.count }
    return new Map([...acc, [keyOf(row), next] as const])
  }, new Map())
  return [...merged.values()]
}

/** Adds copies to stacks, creating the rows or raising their counts. */
export async function addToStack(db: DbExecutor, rows: readonly StackRowInput[]): Promise<void> {
  if (rows.length === 0) return
  await db
    .insert(cardCopyStacks)
    .values(mergeRows(rows))
    .onConflictDoUpdate({
      target: [
        cardCopyStacks.cardId,
        cardCopyStacks.ownerId,
        cardCopyStacks.variant,
        cardCopyStacks.tierAtMint,
      ],
      set: {
        count: sql`${cardCopyStacks.count} + excluded.count`,
        updatedAt: sql`now()`,
      },
    })
}

/** Removes copies from one stack entry, deleting the row when it empties; throws when the entry changed. */
export async function removeFromStack(db: DbExecutor, key: StackKey & StackEntry): Promise<void> {
  const deleted = await db
    .delete(cardCopyStacks)
    .where(and(entryCondition(key), eq(cardCopyStacks.count, key.count)))
    .returning({ count: cardCopyStacks.count })
  if (deleted.length > 0) return
  const updated = await db
    .update(cardCopyStacks)
    .set({ count: sql`${cardCopyStacks.count} - ${key.count}`, updatedAt: new Date() })
    .where(and(entryCondition(key), gt(cardCopyStacks.count, key.count)))
    .returning({ count: cardCopyStacks.count })
  if (updated.length === 0) throw new Error('Stack entry changed')
}

/** Lists every stacked copy of the given cards, across owners. */
export async function listStacksOfCards(
  db: DbExecutor,
  cardIds: readonly string[],
): Promise<RemovedStack[]> {
  if (cardIds.length === 0) return []
  return db
    .select({ ownerId: cardCopyStacks.ownerId, cardId: cardCopyStacks.cardId, ...stackColumns })
    .from(cardCopyStacks)
    .where(inArray(cardCopyStacks.cardId, [...cardIds]))
}

const holderName = sql<
  string | null
>`coalesce(${user.displayUsername}, ${user.username}, ${user.name})`

/** Lists every copy of a card held by other owners who have at least one promoted copy of it. */
export async function listPromotedHolderCopies(
  db: DbExecutor,
  input: { cardId: string; excludeOwnerId: string },
): Promise<PromotedHolderRow[]> {
  const promotedOwners = db
    .select({ ownerId: cardCopies.ownerId })
    .from(cardCopies)
    .where(and(eq(cardCopies.cardId, input.cardId), isNotNull(cardCopies.promotedTier)))
  const rows = await db
    .select({
      ownerId: cardCopies.ownerId,
      displayUsername: holderName,
      variant: cardCopies.variant,
      tierAtMint: cardCopies.tierAtMint,
      promotedTier: cardCopies.promotedTier,
    })
    .from(cardCopies)
    .leftJoin(user, eq(user.id, cardCopies.ownerId))
    .where(
      and(
        eq(cardCopies.cardId, input.cardId),
        ne(cardCopies.ownerId, input.excludeOwnerId),
        inArray(cardCopies.ownerId, promotedOwners),
      ),
    )
    .orderBy(asc(cardCopies.ownerId), asc(cardCopies.variant))
  return rows.map((row) => ({
    ownerId: row.ownerId,
    displayUsername: row.displayUsername,
    copy: { variant: row.variant, tierAtMint: row.tierAtMint, promotedTier: row.promotedTier },
  }))
}
