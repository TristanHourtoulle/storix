import { cardCopies, cardCopyStacks, cards, whatsNewReads, type DbExecutor } from '@storix/db'
import { and, desc, eq, gt, sql } from 'drizzle-orm'

export interface WhatsNewRead {
  releaseId: string
  seenAt: Date
}

export interface UpsertWhatsNewReadInput {
  userId: string
  releaseId: string
  now: Date
}

export interface MemberLeagueInput {
  leagueId: string
  userId: string
}

/** Finds the last release a user marked as seen; null when they never did. */
export async function findWhatsNewRead(
  db: DbExecutor,
  userId: string,
): Promise<WhatsNewRead | null> {
  const rows = await db
    .select({ releaseId: whatsNewReads.releaseId, seenAt: whatsNewReads.seenAt })
    .from(whatsNewReads)
    .where(eq(whatsNewReads.userId, userId))
    .limit(1)
  return rows[0] ?? null
}

/** Reads the seen row of a user and locks it for the current transaction. */
export async function lockWhatsNewRead(
  db: DbExecutor,
  userId: string,
): Promise<WhatsNewRead | null> {
  const rows = await db
    .select({ releaseId: whatsNewReads.releaseId, seenAt: whatsNewReads.seenAt })
    .from(whatsNewReads)
    .where(eq(whatsNewReads.userId, userId))
    .limit(1)
    .for('update')
  return rows[0] ?? null
}

/** Stores the last release a user has seen, replacing the previous one. */
export async function upsertWhatsNewRead(
  db: DbExecutor,
  input: UpsertWhatsNewReadInput,
): Promise<void> {
  await db
    .insert(whatsNewReads)
    .values({
      userId: input.userId,
      releaseId: input.releaseId,
      seenAt: input.now,
      updatedAt: input.now,
    })
    .onConflictDoUpdate({
      target: whatsNewReads.userId,
      set: { releaseId: input.releaseId, seenAt: input.now, updatedAt: input.now },
    })
}

/** Finds the active league card of the member's highest effective tier copy, newest copy first on ties. */
export async function findShowcaseCardId(
  db: DbExecutor,
  input: MemberLeagueInput,
): Promise<string | null> {
  const rows = await db
    .select({ cardId: cardCopies.cardId })
    .from(cardCopies)
    .innerJoin(cards, eq(cards.id, cardCopies.cardId))
    .where(
      and(
        eq(cardCopies.leagueId, input.leagueId),
        eq(cardCopies.ownerId, input.userId),
        eq(cards.status, 'active'),
      ),
    )
    .orderBy(
      sql`greatest(${cardCopies.promotedTier}, ${cards.tier}) DESC`,
      desc(cardCopies.createdAt),
    )
    .limit(1)
  return rows[0]?.cardId ?? null
}

/** Finds the active league card where the member holds the biggest duplicate stack. */
export async function findStackCardId(
  db: DbExecutor,
  input: MemberLeagueInput,
): Promise<string | null> {
  const rows = await db
    .select({ cardId: cardCopyStacks.cardId })
    .from(cardCopyStacks)
    .innerJoin(cards, eq(cards.id, cardCopyStacks.cardId))
    .where(
      and(
        eq(cardCopyStacks.leagueId, input.leagueId),
        eq(cardCopyStacks.ownerId, input.userId),
        eq(cards.status, 'active'),
        gt(cardCopyStacks.count, 0),
      ),
    )
    .orderBy(desc(cardCopyStacks.count), desc(cardCopyStacks.updatedAt))
    .limit(1)
  return rows[0]?.cardId ?? null
}
