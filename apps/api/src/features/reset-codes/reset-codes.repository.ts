import { passwordResetCodes, type DbExecutor } from '@storix/db'
import { RESET_CODE_MAX_ATTEMPTS } from '@storix/shared'
import { and, desc, eq, gt, isNull, lt, sql } from 'drizzle-orm'

export interface ResetCodeRecord {
  id: string
  codeHash: string
  expiresAt: Date
  usedAt: Date | null
  failedAttempts: number
}

/** Deletes every unused reset code of the user. */
export async function deleteUnusedCodes(db: DbExecutor, userId: string): Promise<void> {
  await db
    .delete(passwordResetCodes)
    .where(and(eq(passwordResetCodes.userId, userId), isNull(passwordResetCodes.usedAt)))
}

/** Inserts a reset code hash. */
export async function insertResetCode(
  db: DbExecutor,
  input: { userId: string; issuedBy: string; codeHash: string; expiresAt: Date },
): Promise<void> {
  await db.insert(passwordResetCodes).values(input)
}

/** Finds the user's most recently issued unused reset code. */
export async function findLatestUnusedCode(
  db: DbExecutor,
  userId: string,
): Promise<ResetCodeRecord | null> {
  const rows = await db
    .select({
      id: passwordResetCodes.id,
      codeHash: passwordResetCodes.codeHash,
      expiresAt: passwordResetCodes.expiresAt,
      usedAt: passwordResetCodes.usedAt,
      failedAttempts: passwordResetCodes.failedAttempts,
    })
    .from(passwordResetCodes)
    .where(and(eq(passwordResetCodes.userId, userId), isNull(passwordResetCodes.usedAt)))
    .orderBy(desc(passwordResetCodes.createdAt), desc(passwordResetCodes.id))
    .limit(1)
  return rows[0] ?? null
}

/** Atomically increments the failed attempt counter and returns the stored value; null when the code is gone. */
export async function incrementFailedAttempts(db: DbExecutor, id: string): Promise<number | null> {
  const rows = await db
    .update(passwordResetCodes)
    .set({ failedAttempts: sql`${passwordResetCodes.failedAttempts} + 1` })
    .where(eq(passwordResetCodes.id, id))
    .returning({ failedAttempts: passwordResetCodes.failedAttempts })
  return rows[0]?.failedAttempts ?? null
}

/** Marks a reset code as used only if it is still unused, unexpired and under the attempt limit; false otherwise. */
export async function markCodeUsed(db: DbExecutor, id: string, now: Date): Promise<boolean> {
  const rows = await db
    .update(passwordResetCodes)
    .set({ usedAt: now })
    .where(
      and(
        eq(passwordResetCodes.id, id),
        isNull(passwordResetCodes.usedAt),
        lt(passwordResetCodes.failedAttempts, RESET_CODE_MAX_ATTEMPTS),
        gt(passwordResetCodes.expiresAt, now),
      ),
    )
    .returning({ id: passwordResetCodes.id })
  return rows.length > 0
}
