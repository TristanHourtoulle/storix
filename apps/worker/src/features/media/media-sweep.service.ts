import type { Database } from '@storix/db'
import { UPLOAD_PRESIGN_TTL_SECONDS } from '@storix/shared/domain'
import type { ObjectStorage } from '@storix/storage'
import type { MediaQueue } from '../../jobs/media-queue'
import type { WorkerLogger } from '../../lib/logger'
import * as repository from './media.repository'

const MINUTE_MS = 60 * 1000
const PENDING_MAX_AGE_MS = 60 * MINUTE_MS
const UPLOADED_MAX_AGE_MS = 10 * MINUTE_MS
const PROCESSING_MAX_AGE_MS = 30 * MINUTE_MS
const MAX_PROCESS_JOBS = 3

if (UPLOAD_PRESIGN_TTL_SECONDS * 1000 >= PENDING_MAX_AGE_MS) {
  throw new Error('Pending uploads must outlive their presigned POST before being swept')
}

export interface MediaSweepService {
  sweep(): Promise<void>
}

interface Deps {
  db: Database
  storage: ObjectStorage
  clock: () => Date
  logger: WorkerLogger
  queue: Pick<MediaQueue, 'enqueueMediaProcess' | 'processJobHistory'>
}

type StuckOutcome = 'waiting' | 'requeued' | 'failed'

/** Creates the use case cleaning abandoned uploads and recovering stuck processing. */
export function createMediaSweepService(deps: Deps): MediaSweepService {
  const { db, storage, clock, logger, queue } = deps

  async function recover(upload: repository.StaleUpload): Promise<StuckOutcome> {
    const history = await queue.processJobHistory(upload.id)
    if (history.live > 0) return 'waiting'
    if (history.total < MAX_PROCESS_JOBS) {
      await queue.enqueueMediaProcess({ uploadId: upload.id })
      return 'requeued'
    }
    await repository.markUploadFailed(db, upload.id, clock())
    await storage.delete([upload.objectKey])
    logger.warn({ uploadId: upload.id, jobs: history.total }, 'Stuck upload marked failed')
    return 'failed'
  }

  return {
    async sweep() {
      const now = clock().getTime()
      const stale = await repository.findStaleUploads(db, {
        pendingBefore: new Date(now - PENDING_MAX_AGE_MS),
        uploadedBefore: new Date(now - UPLOADED_MAX_AGE_MS),
        processingBefore: new Date(now - PROCESSING_MAX_AGE_MS),
      })
      const abandoned = stale.filter((upload) => upload.status === 'pending')
      const stuck = stale.filter((upload) => upload.status !== 'pending')

      if (abandoned.length > 0) {
        await storage.delete(abandoned.map((upload) => upload.objectKey))
      }
      const deleted = await repository.deleteUploads(
        db,
        abandoned.map((upload) => upload.id),
      )
      const outcomes: StuckOutcome[] = []
      for (const upload of stuck) {
        try {
          outcomes.push(await recover(upload))
        } catch (error) {
          logger.error({ uploadId: upload.id, err: error }, 'Failed to recover stuck upload')
        }
      }
      const count = (kind: StuckOutcome) => outcomes.filter((outcome) => outcome === kind).length
      logger.info(
        {
          deleted,
          waiting: count('waiting'),
          requeued: count('requeued'),
          failed: count('failed'),
        },
        'Media sweep done',
      )
    },
  }
}
