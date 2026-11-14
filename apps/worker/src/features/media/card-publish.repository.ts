import { and, eq, isNull, lt, or } from 'drizzle-orm'
import { leagueMembers, media, uploads, type DbExecutor } from '@storix/db'
import { cropRectSchema, type CropRect, type MediaVariant } from '@storix/shared'
import {
  requireCardUpload,
  toUploadForProcessing,
  uploadColumns,
  type CardUpload,
} from './media.repository'

export interface PublishMedia {
  id: string
  sourceSha256: string
  width: number
  height: number
  crop: CropRect | null
  variants: MediaVariant[]
}

export type PublishRow = CardUpload & {
  publishRequestedAt: Date | null
  cardId: string | null
  media: PublishMedia | null
}

const publishColumns = {
  ...uploadColumns,
  publishRequestedAt: uploads.publishRequestedAt,
  cardId: uploads.cardId,
  mediaId: media.id,
  sourceSha256: media.sourceSha256,
  mediaWidth: media.width,
  mediaHeight: media.height,
  mediaCrop: media.crop,
  variants: media.variants,
}

function selectPublishRow(db: DbExecutor, uploadId: string) {
  return db
    .select(publishColumns)
    .from(uploads)
    .leftJoin(media, eq(media.uploadId, uploads.id))
    .where(and(eq(uploads.id, uploadId), eq(uploads.kind, 'card')))
}

type RawPublishRow = Awaited<ReturnType<typeof selectPublishRow>>[number]

function toPublishRow(row: RawPublishRow): PublishRow {
  const { publishRequestedAt, cardId, mediaId, sourceSha256, mediaWidth, mediaHeight } = row
  const mediaCrop = cropRectSchema.nullable().safeParse(row.mediaCrop ?? null)
  const hasMedia =
    mediaId !== null &&
    sourceSha256 !== null &&
    mediaWidth !== null &&
    mediaHeight !== null &&
    row.variants !== null
  return {
    ...requireCardUpload(
      toUploadForProcessing({
        id: row.id,
        kind: row.kind,
        leagueId: row.leagueId,
        userId: row.userId,
        objectKey: row.objectKey,
        status: row.status,
        title: row.title,
        taggedUserIds: row.taggedUserIds,
        seriesIds: row.seriesIds,
        clientCapturedAt: row.clientCapturedAt,
        stageOnly: row.stageOnly,
        crop: row.crop,
        isMoment: row.isMoment,
      }),
    ),
    publishRequestedAt,
    cardId,
    media: hasMedia
      ? {
          id: mediaId,
          sourceSha256,
          width: mediaWidth,
          height: mediaHeight,
          crop: mediaCrop.success ? mediaCrop.data : null,
          variants: row.variants ?? [],
        }
      : null,
  }
}

/** Loads an upload with its media for the publish job, without locking. */
export async function findUploadForPublish(
  db: DbExecutor,
  uploadId: string,
): Promise<PublishRow | null> {
  const [row] = await selectPublishRow(db, uploadId)
  return row === undefined ? null : toPublishRow(row)
}

/** Locks an upload row for update and loads it with its media for the publish commit. */
export async function lockUploadForPublish(
  tx: DbExecutor,
  uploadId: string,
): Promise<PublishRow | null> {
  const [row] = await selectPublishRow(tx, uploadId).for('update', { of: uploads })
  return row === undefined ? null : toPublishRow(row)
}

/** Replaces the variants a media is displayed with and records the crop they were rendered with. */
export async function updateMediaDisplay(
  tx: DbExecutor,
  input: { mediaId: string; variants: MediaVariant[]; crop: CropRect | null },
): Promise<void> {
  await tx
    .update(media)
    .set({ variants: input.variants, crop: input.crop })
    .where(eq(media.id, input.mediaId))
}

/** Sends a publishing upload back to staged while it is still stuck; false when it moved on or was re-kicked since `stuckBefore`. */
export async function revertPublishing(
  db: DbExecutor,
  uploadId: string,
  stuckBefore: Date,
): Promise<boolean> {
  const rows = await db
    .update(uploads)
    .set({ status: 'staged', publishRequestedAt: null })
    .where(
      and(
        eq(uploads.id, uploadId),
        eq(uploads.status, 'publishing'),
        or(isNull(uploads.publishRequestedAt), lt(uploads.publishRequestedAt, stuckBefore)),
      ),
    )
    .returning({ id: uploads.id })
  return rows.length > 0
}

/** Locks the author's membership row in key share mode; false when the author is no longer a member. */
export async function lockAuthorMembership(
  tx: DbExecutor,
  input: { leagueId: string; userId: string },
): Promise<boolean> {
  const rows = await tx
    .select({ userId: leagueMembers.userId })
    .from(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, input.leagueId), eq(leagueMembers.userId, input.userId)))
    .for('key share')
  return rows.length > 0
}

/** Withdraws a publishing upload whose author left; false when it is no longer publishing. */
export async function discardPublishing(
  db: DbExecutor,
  uploadId: string,
  now: Date,
): Promise<boolean> {
  const rows = await db
    .update(uploads)
    .set({ status: 'discarded', processedAt: now })
    .where(and(eq(uploads.id, uploadId), eq(uploads.status, 'publishing')))
    .returning({ id: uploads.id })
  return rows.length > 0
}
