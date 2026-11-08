import { and, eq } from 'drizzle-orm'
import { media, uploads, type DbExecutor } from '@storix/db'
import { cropRectSchema, type CropRect, type MediaVariant } from '@storix/shared'
import { toUploadForProcessing, uploadColumns, type UploadForProcessing } from './media.repository'

export interface PublishMedia {
  id: string
  sourceSha256: string
  width: number
  height: number
  crop: CropRect | null
  variants: MediaVariant[]
}

export type PublishRow = UploadForProcessing & {
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
    .where(eq(uploads.id, uploadId))
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
    ...toUploadForProcessing(row),
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

/** Sends a publishing upload back to staged; false when it is no longer publishing. */
export async function revertPublishing(db: DbExecutor, uploadId: string): Promise<boolean> {
  const rows = await db
    .update(uploads)
    .set({ status: 'staged', publishRequestedAt: null })
    .where(and(eq(uploads.id, uploadId), eq(uploads.status, 'publishing')))
    .returning({ id: uploads.id })
  return rows.length > 0
}
