import { leagueMembers, uploads, type DbExecutor } from '@storix/db'
import { QUOTA_COMPLETED_STATUSES, type LeagueRole } from '@storix/shared'
import { and, count, eq, gte, inArray, or } from 'drizzle-orm'

export type UploadRow = typeof uploads.$inferSelect

/** Locks the member row so concurrent quota checks for the same member serialize; returns the current role, or null when the member is gone. */
export async function lockMemberRole(
  db: DbExecutor,
  leagueId: string,
  userId: string,
): Promise<LeagueRole | null> {
  const rows = await db
    .select({ role: leagueMembers.role })
    .from(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, userId)))
    .for('update')
  return rows[0]?.role ?? null
}

/** Counts the member's quota-consuming uploads: completed since `since`, pending since `pendingSince`. */
export async function countUploadsSince(
  db: DbExecutor,
  input: { leagueId: string; userId: string; since: Date; pendingSince: Date },
): Promise<number> {
  const rows = await db
    .select({ total: count() })
    .from(uploads)
    .where(
      and(
        eq(uploads.kind, 'card'),
        eq(uploads.leagueId, input.leagueId),
        eq(uploads.userId, input.userId),
        or(
          and(
            inArray(uploads.status, [...QUOTA_COMPLETED_STATUSES]),
            gte(uploads.createdAt, input.since),
          ),
          and(eq(uploads.status, 'pending'), gte(uploads.createdAt, input.pendingSince)),
        ),
      ),
    )
  return rows[0]?.total ?? 0
}

/** Inserts a pending upload. */
export async function insertUpload(
  db: DbExecutor,
  input: { id: string; leagueId: string; userId: string; objectKey: string },
): Promise<void> {
  await db.insert(uploads).values(input)
}

/** Finds a card upload by id within a league. */
export async function findUpload(
  db: DbExecutor,
  leagueId: string,
  uploadId: string,
): Promise<UploadRow | null> {
  const rows = await db
    .select()
    .from(uploads)
    .where(and(eq(uploads.id, uploadId), eq(uploads.kind, 'card'), eq(uploads.leagueId, leagueId)))
    .limit(1)
  return rows[0] ?? null
}

/** Moves a pending upload to uploaded with its card metadata and stage mode; false when it was no longer pending. */
export async function markUploaded(
  db: DbExecutor,
  input: {
    id: string
    title: string | null
    taggedUserIds: string[]
    clientCapturedAt: Date | null
    stageOnly: boolean
    now: Date
  },
): Promise<boolean> {
  const rows = await db
    .update(uploads)
    .set({
      status: 'uploaded',
      title: input.title,
      taggedUserIds: input.taggedUserIds,
      clientCapturedAt: input.clientCapturedAt,
      stageOnly: input.stageOnly,
      completedAt: input.now,
    })
    .where(and(eq(uploads.id, input.id), eq(uploads.status, 'pending')))
    .returning({ id: uploads.id })
  return rows.length > 0
}
