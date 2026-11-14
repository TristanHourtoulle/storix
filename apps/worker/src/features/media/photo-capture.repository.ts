import { media, uploads, type DbExecutor } from '@storix/db'
import { captureInstant } from '@storix/shared/domain'
import { eq } from 'drizzle-orm'

/** Returns when the photo of an upload was taken: the media date, else the phone date, else the upload time. */
export async function findPhotoCapture(
  db: DbExecutor,
  input: { uploadId: string; mediaId: string },
): Promise<Date> {
  const [mediaRow] = await db
    .select({ capturedAt: media.capturedAt })
    .from(media)
    .where(eq(media.id, input.mediaId))
    .limit(1)
  const [uploadRow] = await db
    .select({ clientCapturedAt: uploads.clientCapturedAt, createdAt: uploads.createdAt })
    .from(uploads)
    .where(eq(uploads.id, input.uploadId))
    .limit(1)
  if (uploadRow === undefined) throw new Error(`Upload ${input.uploadId} missing`)
  return captureInstant({
    mediaCapturedAt: mediaRow?.capturedAt ?? null,
    clientCapturedAt: uploadRow.clientCapturedAt,
    uploadedAt: uploadRow.createdAt,
  })
}
