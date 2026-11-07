import type { Database } from '@storix/db'
import type { MediaProcessPayload } from '@storix/shared'
import type { ObjectStorage } from '@storix/storage'
import type { WorkerLogger } from '../../lib/logger'
import * as repository from './media.repository'

const PENDING_MAX_AGE_MS = 60 * 60 * 1000
const UPLOADED_MAX_AGE_MS = 10 * 60 * 1000

export interface MediaSweepService {
  sweep(): Promise<void>
}

interface Deps {
  db: Database
  storage: ObjectStorage
  clock: () => Date
  logger: WorkerLogger
  enqueueMediaProcess: (payload: MediaProcessPayload) => Promise<void>
}

/** Creates the use case cleaning abandoned uploads and re-enqueuing lost processing jobs. */
export function createMediaSweepService(deps: Deps): MediaSweepService {
  const { db, storage, clock, logger, enqueueMediaProcess } = deps

  return {
    async sweep() {
      const now = clock().getTime()
      const stale = await repository.findStaleUploads(db, {
        pendingBefore: new Date(now - PENDING_MAX_AGE_MS),
        uploadedBefore: new Date(now - UPLOADED_MAX_AGE_MS),
      })
      const abandoned = stale.filter((upload) => upload.status === 'pending')
      const lost = stale.filter((upload) => upload.status === 'uploaded')

      if (abandoned.length > 0) {
        await storage.delete(abandoned.map((upload) => upload.objectKey))
      }
      const deleted = await repository.deleteUploads(
        db,
        abandoned.map((upload) => upload.id),
      )
      for (const upload of lost) {
        await enqueueMediaProcess({ uploadId: upload.id })
      }
      logger.info({ deleted, requeued: lost.length }, 'Media sweep done')
    },
  }
}
