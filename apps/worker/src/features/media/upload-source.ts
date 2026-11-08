import { UPLOAD_MAX_BYTES } from '@storix/shared/domain'
import { ObjectTooLargeError, type ObjectStorage } from '@storix/storage'

export type UploadSource =
  { buffer: Buffer } | { buffer: null; reason: 'MISSING_OBJECT' | 'TOO_LARGE' }

/** Reads an uploaded source object, capped at the upload size limit. */
export async function readUploadSource(
  storage: ObjectStorage,
  objectKey: string,
): Promise<UploadSource> {
  try {
    const buffer = await storage.getBuffer(objectKey, UPLOAD_MAX_BYTES)
    return buffer === null ? { buffer: null, reason: 'MISSING_OBJECT' } : { buffer }
  } catch (error) {
    if (error instanceof ObjectTooLargeError) return { buffer: null, reason: 'TOO_LARGE' }
    throw error
  }
}
