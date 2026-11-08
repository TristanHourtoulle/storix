import { leagues, uploads, user, type DbExecutor } from '@storix/db'
import type { PortraitKind } from '@storix/shared'
import { and, eq, isNull } from 'drizzle-orm'
import type { UploadRow } from '../uploads/uploads.repository'

export {
  deletePortraitAndUpload,
  findPortraitForOwner,
  portraitKeysOf,
  type StoredPortrait,
} from '@storix/db'

/** Inserts a pending portrait upload; `leagueId` is null exactly for an avatar. */
export async function insertPortraitUpload(
  db: DbExecutor,
  input: {
    id: string
    kind: PortraitKind
    leagueId: string | null
    userId: string
    objectKey: string
  },
): Promise<void> {
  await db.insert(uploads).values(input)
}

/** Finds a portrait upload matching its id, kind, uploader and league (null for an avatar). */
export async function findPortraitUpload(
  db: DbExecutor,
  input: { uploadId: string; kind: PortraitKind; userId: string; leagueId: string | null },
): Promise<UploadRow | null> {
  const rows = await db
    .select()
    .from(uploads)
    .where(
      and(
        eq(uploads.id, input.uploadId),
        eq(uploads.kind, input.kind),
        eq(uploads.userId, input.userId),
        input.leagueId === null ? isNull(uploads.leagueId) : eq(uploads.leagueId, input.leagueId),
      ),
    )
    .limit(1)
  return rows[0] ?? null
}

/** Moves a pending portrait upload to uploaded; false when it was no longer pending. */
export async function markPortraitUploaded(
  db: DbExecutor,
  input: { id: string; now: Date },
): Promise<boolean> {
  const rows = await db
    .update(uploads)
    .set({ status: 'uploaded', completedAt: input.now })
    .where(and(eq(uploads.id, input.id), eq(uploads.status, 'pending')))
    .returning({ id: uploads.id })
  return rows.length > 0
}

/** Locks a user row `FOR UPDATE`; false when the account is gone. */
export async function lockUserRow(db: DbExecutor, userId: string): Promise<boolean> {
  const rows = await db.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('update')
  return rows.length > 0
}

/** Locks a league row `FOR UPDATE`; false when the league is gone. */
export async function lockLeagueRow(db: DbExecutor, leagueId: string): Promise<boolean> {
  const rows = await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .for('update')
  return rows.length > 0
}
