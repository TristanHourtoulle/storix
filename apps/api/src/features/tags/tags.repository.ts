import { cardTags, type DbExecutor } from '@storix/db'
import { and, count, eq } from 'drizzle-orm'

export interface CardTagKey {
  cardId: string
  userId: string
}

/** Counts the members tagged on a card. */
export async function countCardTags(db: DbExecutor, cardId: string): Promise<number> {
  const rows = await db.select({ n: count() }).from(cardTags).where(eq(cardTags.cardId, cardId))
  return rows[0]?.n ?? 0
}

/** Tags a user on a card; false when they were already tagged. */
export async function insertCardTag(
  db: DbExecutor,
  input: CardTagKey & { taggedById: string; now: Date },
): Promise<boolean> {
  const rows = await db
    .insert(cardTags)
    .values({
      cardId: input.cardId,
      userId: input.userId,
      taggedById: input.taggedById,
      createdAt: input.now,
    })
    .onConflictDoNothing()
    .returning({ cardId: cardTags.cardId })
  return rows.length > 0
}

/** Removes a user's tag from a card; false when there was none. */
export async function deleteCardTag(db: DbExecutor, key: CardTagKey): Promise<boolean> {
  const rows = await db
    .delete(cardTags)
    .where(and(eq(cardTags.cardId, key.cardId), eq(cardTags.userId, key.userId)))
    .returning({ cardId: cardTags.cardId })
  return rows.length > 0
}
