import { SELFIE_SIZES, selfieKey, storedSelfieKeys, type SelfieSize } from '@storix/shared/domain'
import type { Database } from '@storix/db'
import type { ObjectStorage } from '@storix/storage'
import { createBestEffort } from '../../lib/best-effort'
import type { WorkerLogger } from '../../lib/logger'
import type { ImagePipeline } from '../media/image-pipeline'
import { openImage } from '../media/image-pipeline'
import { readUploadSource } from '../media/upload-source'
import { markUploadFailed, markUploadRejected } from '../media/media.repository'
import { markPortraitUploadReady } from '../portraits/portraits.repository'

const SELFIE_CACHE_CONTROL = 'public, max-age=31536000, immutable'
const SELFIE_WEBP_QUALITY = 80
const SELFIE_ASPECT = 4 / 3

export interface SelfieUpload {
  id: string
  leagueId: string
  objectKey: string
}

export interface SelfieProcessingService {
  processUpload(upload: SelfieUpload, input: { isFinalAttempt: boolean }): Promise<void>
}

interface Deps {
  db: Database
  storage: ObjectStorage
  pipeline: Pick<ImagePipeline, 'probeJpeg'>
  clock: () => Date
  logger: WorkerLogger
}

async function renderSize(buffer: Buffer, width: SelfieSize): Promise<Buffer> {
  return openImage(buffer)
    .autoOrient()
    .resize(width, Math.round(width * SELFIE_ASPECT), { fit: 'cover', position: 'centre' })
    .webp({ quality: SELFIE_WEBP_QUALITY })
    .toBuffer()
}

/** Creates the use case rendering a Moment selfie into small upright 3:4 WebP files, without metadata. */
export function createSelfieProcessingService(deps: Deps): SelfieProcessingService {
  const { db, storage, pipeline, clock, logger } = deps
  const bestEffort = createBestEffort(logger)

  async function process(upload: SelfieUpload): Promise<void> {
    const source = await readUploadSource(storage, upload.objectKey)
    const probe = source.buffer === null ? null : await pipeline.probeJpeg(source.buffer)
    if (source.buffer === null || probe === null || !probe.ok) {
      await markUploadRejected(db, upload.id, 'INVALID_IMAGE', clock())
      await storage.delete([upload.objectKey])
      logger.info({ uploadId: upload.id }, 'Selfie upload rejected')
      return
    }
    const buffer = source.buffer
    for (const size of SELFIE_SIZES) {
      await storage.put({
        key: selfieKey({ leagueId: upload.leagueId, uploadId: upload.id, size }),
        body: await renderSize(buffer, size),
        contentType: 'image/webp',
        cacheControl: SELFIE_CACHE_CONTROL,
      })
    }
    const isReady = await markPortraitUploadReady(db, upload.id, clock())
    await storage.delete([upload.objectKey])
    logger.info({ uploadId: upload.id, isReady }, 'Selfie rendered')
  }

  return {
    async processUpload(upload, input) {
      try {
        await process(upload)
      } catch (error) {
        if (input.isFinalAttempt) {
          logger.error({ uploadId: upload.id, err: error }, 'Selfie processing failed for good')
          await bestEffort({ uploadId: upload.id }, 'Failed to mark selfie upload failed', () =>
            markUploadFailed(db, upload.id, clock()),
          )
          await bestEffort({ uploadId: upload.id }, 'Failed to delete selfie objects', () =>
            storage.delete([
              upload.objectKey,
              ...storedSelfieKeys({ leagueId: upload.leagueId, uploadId: upload.id }),
            ]),
          )
        }
        throw error
      }
    },
  }
}
