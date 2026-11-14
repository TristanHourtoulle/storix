import { and, count, eq, gte, inArray } from 'drizzle-orm'
import { momentPosts, uploads, type DbExecutor } from '@storix/db'

export type MomentPostRow = typeof momentPosts.$inferSelect
export type MomentUploadRow = typeof uploads.$inferSelect

/** Finds a member's post for one Moment. */
export async function findMemberPost(
  db: DbExecutor,
  input: { leagueId: string; day: string; userId: string },
): Promise<MomentPostRow | null> {
  const rows = await db
    .select()
    .from(momentPosts)
    .where(
      and(
        eq(momentPosts.leagueId, input.leagueId),
        eq(momentPosts.day, input.day),
        eq(momentPosts.userId, input.userId),
      ),
    )
    .limit(1)
  return rows[0] ?? null
}

/** Counts the Moment upload pairs a member reserved since `since`, to cap abandoned reservations. */
export async function countMomentReservationsSince(
  db: DbExecutor,
  input: { leagueId: string; userId: string; since: Date },
): Promise<number> {
  const rows = await db
    .select({ total: count() })
    .from(uploads)
    .where(
      and(
        eq(uploads.leagueId, input.leagueId),
        eq(uploads.userId, input.userId),
        eq(uploads.isMoment, true),
        gte(uploads.createdAt, input.since),
      ),
    )
  return rows[0]?.total ?? 0
}

/** Inserts the pending back-camera card upload and selfie upload of a Moment. */
export async function insertMomentUploads(
  db: DbExecutor,
  input: {
    leagueId: string
    userId: string
    back: { id: string; objectKey: string }
    selfie: { id: string; objectKey: string }
  },
): Promise<void> {
  await db.insert(uploads).values([
    {
      ...input.back,
      kind: 'card',
      isMoment: true,
      leagueId: input.leagueId,
      userId: input.userId,
    },
    { ...input.selfie, kind: 'selfie', leagueId: input.leagueId, userId: input.userId },
  ])
}

/** Reads a member's uploads in a league, without locking them. */
export function findMemberUploads(
  db: DbExecutor,
  input: { leagueId: string; userId: string; uploadIds: readonly string[] },
): Promise<MomentUploadRow[]> {
  return db
    .select()
    .from(uploads)
    .where(
      and(
        inArray(uploads.id, [...input.uploadIds]),
        eq(uploads.leagueId, input.leagueId),
        eq(uploads.userId, input.userId),
      ),
    )
}

/** Locks and returns a member's upload in a league, or null. */
export async function lockMemberUpload(
  db: DbExecutor,
  input: { leagueId: string; userId: string; uploadId: string },
): Promise<MomentUploadRow | null> {
  const rows = await db
    .select()
    .from(uploads)
    .where(
      and(
        eq(uploads.id, input.uploadId),
        eq(uploads.leagueId, input.leagueId),
        eq(uploads.userId, input.userId),
      ),
    )
    .for('update')
  return rows[0] ?? null
}

/** Completes the two pending uploads of a Moment: the back photo becomes a titled card upload. */
export async function completeMomentUploads(
  db: DbExecutor,
  input: {
    backUploadId: string
    selfieUploadId: string
    title: string
    capturedAt: Date | null
    seriesIds: readonly string[]
    now: Date
  },
): Promise<void> {
  await db
    .update(uploads)
    .set({
      status: 'uploaded',
      title: input.title,
      clientCapturedAt: input.capturedAt,
      seriesIds: [...input.seriesIds],
      stageOnly: false,
      completedAt: input.now,
    })
    .where(and(eq(uploads.id, input.backUploadId), eq(uploads.status, 'pending')))
  await db
    .update(uploads)
    .set({ status: 'uploaded', completedAt: input.now })
    .where(and(eq(uploads.id, input.selfieUploadId), eq(uploads.status, 'pending')))
}

/** Inserts a Moment post; false when the member already posted for that Moment. */
export async function insertMomentPost(
  db: DbExecutor,
  row: typeof momentPosts.$inferInsert,
): Promise<boolean> {
  const inserted = await db
    .insert(momentPosts)
    .values(row)
    .onConflictDoNothing()
    .returning({ id: momentPosts.id })
  return inserted.length > 0
}
