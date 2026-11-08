import { and, eq, inArray, isNull, lt, notExists, or, sql } from 'drizzle-orm'
import {
  auditLog,
  cards,
  cardTags,
  leagueMembers,
  media,
  uploads,
  type AuditAction,
  type DbExecutor,
} from '@storix/db'
import {
  cropRectSchema,
  taggedUserIdsSchema,
  type CardTier,
  type CropRect,
  type MediaVariant,
  type UploadRejectionReason,
  type UploadStatus,
} from '@storix/shared'

export interface UploadForProcessing {
  id: string
  leagueId: string
  userId: string | null
  objectKey: string
  status: UploadStatus
  title: string | null
  taggedUserIds: string[]
  clientCapturedAt: Date | null
  stageOnly: boolean
  crop: CropRect | null
  hasInvalidCrop: boolean
}

export type OwnedUpload = UploadForProcessing & { userId: string }

export interface NewMediaRow {
  leagueId: string
  uploadId: string
  sourceSha256: string
  phash: string
  thumbhash: string
  dominantColor: string
  width: number
  height: number
  capturedAt: Date | null
  captureDateSource: 'exif' | 'client' | null
  variants: MediaVariant[]
}

export interface NewCardRow {
  leagueId: string
  mediaId: string
  authorId: string
  number: number
  title: string
  tier: CardTier
  isProvisional: boolean
}

export interface StaleUpload {
  id: string
  status: UploadStatus
  objectKey: string
}

const PROCESSABLE: UploadStatus[] = ['uploaded', 'processing']
const LEAGUE_MEDIA_LOCK_NAMESPACE = 7201

export const uploadColumns = {
  id: uploads.id,
  leagueId: uploads.leagueId,
  userId: uploads.userId,
  objectKey: uploads.objectKey,
  status: uploads.status,
  title: uploads.title,
  taggedUserIds: uploads.taggedUserIds,
  clientCapturedAt: uploads.clientCapturedAt,
  stageOnly: uploads.stageOnly,
  crop: uploads.crop,
}

interface RawUploadRow extends Omit<
  UploadForProcessing,
  'crop' | 'hasInvalidCrop' | 'taggedUserIds'
> {
  crop: unknown
  taggedUserIds: unknown
}

/** Parses the jsonb columns of an upload row; an unreadable crop becomes null and is flagged. */
export function toUploadForProcessing(row: RawUploadRow): UploadForProcessing {
  const crop = cropRectSchema.nullable().safeParse(row.crop ?? null)
  return {
    ...row,
    taggedUserIds: taggedUserIdsSchema.parse(row.taggedUserIds),
    crop: crop.success ? crop.data : null,
    hasInvalidCrop: !crop.success,
  }
}

/** Loads the upload fields the processing job needs. */
export async function findUploadForProcessing(
  db: DbExecutor,
  uploadId: string,
): Promise<UploadForProcessing | null> {
  const [row] = await db.select(uploadColumns).from(uploads).where(eq(uploads.id, uploadId))
  return row === undefined ? null : toUploadForProcessing(row)
}

/** Moves an upload to processing; false when it is no longer processable. */
export async function markUploadProcessing(db: DbExecutor, uploadId: string): Promise<boolean> {
  const rows = await db
    .update(uploads)
    .set({ status: 'processing' })
    .where(and(eq(uploads.id, uploadId), inArray(uploads.status, PROCESSABLE)))
    .returning({ id: uploads.id })
  return rows.length > 0
}

/** Marks a processable upload as rejected; false when another job already settled it. */
export async function markUploadRejected(
  db: DbExecutor,
  uploadId: string,
  reason: UploadRejectionReason,
  now: Date,
): Promise<boolean> {
  const rows = await db
    .update(uploads)
    .set({ status: 'rejected', rejectionReason: reason, processedAt: now })
    .where(and(eq(uploads.id, uploadId), inArray(uploads.status, PROCESSABLE)))
    .returning({ id: uploads.id })
  return rows.length > 0
}

/** Marks a processable upload as failed. */
export async function markUploadFailed(db: DbExecutor, uploadId: string, now: Date): Promise<void> {
  await db
    .update(uploads)
    .set({ status: 'failed', processedAt: now })
    .where(and(eq(uploads.id, uploadId), inArray(uploads.status, PROCESSABLE)))
}

/** Marks an upload in one of the `from` statuses as ready and links its card; returns the updated row count. */
export async function markUploadReady(
  db: DbExecutor,
  uploadId: string,
  cardId: string,
  now: Date,
  from: readonly UploadStatus[],
): Promise<number> {
  const rows = await db
    .update(uploads)
    .set({ status: 'ready', cardId, processedAt: now })
    .where(and(eq(uploads.id, uploadId), inArray(uploads.status, [...from])))
    .returning({ id: uploads.id })
  return rows.length
}

/** Moves a processing upload to staged; false when it left processing (for example, it was discarded). */
export async function markUploadStaged(
  db: DbExecutor,
  uploadId: string,
  now: Date,
): Promise<boolean> {
  const rows = await db
    .update(uploads)
    .set({ status: 'staged', processedAt: now })
    .where(and(eq(uploads.id, uploadId), eq(uploads.status, 'processing')))
    .returning({ id: uploads.id })
  return rows.length > 0
}

/** Serializes media creation for a league until the current transaction ends. */
export async function lockLeagueMedia(db: DbExecutor, leagueId: string): Promise<void> {
  await db.execute(
    sql`select pg_advisory_xact_lock(${LEAGUE_MEDIA_LOCK_NAMESPACE}::int, hashtext(${leagueId}))`,
  )
}

/** Finds a league media with the same source bytes. */
export async function findMediaBySha(
  db: DbExecutor,
  leagueId: string,
  sha: string,
): Promise<{ mediaId: string; sourceSha256: string } | null> {
  const [row] = await db
    .select({ mediaId: media.id, sourceSha256: media.sourceSha256 })
    .from(media)
    .where(and(eq(media.leagueId, leagueId), eq(media.sourceSha256, sha)))
  return row ?? null
}

/** Lists the perceptual hashes of every media in a league. */
export function listLeaguePhashes(
  db: DbExecutor,
  leagueId: string,
): Promise<Array<{ mediaId: string; phash: string; sourceSha256: string }>> {
  return db
    .select({ mediaId: media.id, phash: media.phash, sourceSha256: media.sourceSha256 })
    .from(media)
    .where(eq(media.leagueId, leagueId))
}

/** Returns the next card number of a league. */
export async function nextCardNumber(db: DbExecutor, leagueId: string): Promise<number> {
  const [row] = await db
    .select({ next: sql<number>`coalesce(max(${cards.number}), 0) + 1`.mapWith(Number) })
    .from(cards)
    .where(eq(cards.leagueId, leagueId))
  return row?.next ?? 1
}

/** Inserts a media row and returns its id. */
export async function insertMedia(db: DbExecutor, row: NewMediaRow): Promise<string> {
  const [inserted] = await db.insert(media).values(row).returning({ id: media.id })
  if (!inserted) throw new Error('Media insert returned no row')
  return inserted.id
}

/** Inserts a card row and returns its id. */
export async function insertCard(db: DbExecutor, row: NewCardRow): Promise<string> {
  const [inserted] = await db.insert(cards).values(row).returning({ id: cards.id })
  if (!inserted) throw new Error('Card insert returned no row')
  return inserted.id
}

/** Tags the given users on a card, skipping anyone who is no longer a league member. */
export async function insertCardTags(
  db: DbExecutor,
  input: { cardId: string; leagueId: string; userIds: readonly string[] },
): Promise<void> {
  if (input.userIds.length === 0) return
  const members = await db
    .select({ userId: leagueMembers.userId })
    .from(leagueMembers)
    .where(
      and(
        eq(leagueMembers.leagueId, input.leagueId),
        inArray(leagueMembers.userId, [...input.userIds]),
      ),
    )
  if (members.length === 0) return
  await db
    .insert(cardTags)
    .values(members.map((member) => ({ cardId: input.cardId, userId: member.userId })))
    .onConflictDoNothing()
}

/** Appends an entry to the audit log. */
export async function insertAuditEntry(
  db: DbExecutor,
  entry: {
    leagueId: string
    actorId: string | null
    action: AuditAction
    metadata: Record<string, unknown>
  },
): Promise<void> {
  await db.insert(auditLog).values({ ...entry, targetUserId: null })
}

/** Lists abandoned pending uploads and uploaded or processing ones that look stuck. */
export function findStaleUploads(
  db: DbExecutor,
  input: { pendingBefore: Date; uploadedBefore: Date; processingBefore: Date },
): Promise<StaleUpload[]> {
  return db
    .select({ id: uploads.id, status: uploads.status, objectKey: uploads.objectKey })
    .from(uploads)
    .where(
      or(
        and(eq(uploads.status, 'pending'), lt(uploads.createdAt, input.pendingBefore)),
        and(eq(uploads.status, 'uploaded'), lt(uploads.completedAt, input.uploadedBefore)),
        and(
          eq(uploads.status, 'processing'),
          isNull(uploads.processedAt),
          lt(uploads.completedAt, input.processingBefore),
        ),
      ),
    )
}

/** Deletes pending uploads that no media references. */
export async function deleteUploads(db: DbExecutor, ids: readonly string[]): Promise<number> {
  if (ids.length === 0) return 0
  const rows = await db
    .delete(uploads)
    .where(
      and(
        inArray(uploads.id, [...ids]),
        eq(uploads.status, 'pending'),
        notExists(
          db
            .select({ one: sql`1` })
            .from(media)
            .where(eq(media.uploadId, uploads.id)),
        ),
      ),
    )
    .returning({ id: uploads.id })
  return rows.length
}
