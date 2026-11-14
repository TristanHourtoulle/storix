import type { Database } from '@storix/db'
import {
  DRAFT_TTL_MS,
  PUBLISH_STUCK_MS,
  UPLOAD_PRESIGN_TTL_SECONDS,
  classifyDraftForSweep,
} from '@storix/shared/domain'
import type { ObjectStorage } from '@storix/storage'
import type { MediaQueue } from '../../jobs/media-queue'
import { createBestEffort } from '../../lib/best-effort'
import type { WorkerLogger } from '../../lib/logger'
import { runInTransaction } from '../../lib/transaction'
import type { StorageDeleteService } from '../storage/storage-delete.service'
import * as publishRepository from './card-publish.repository'
import * as draftRepository from './draft-sweep.repository'
import * as repository from './media.repository'

const MINUTE_MS = 60 * 1000
const PENDING_MAX_AGE_MS = 60 * MINUTE_MS
const UPLOADED_MAX_AGE_MS = 10 * MINUTE_MS
const PROCESSING_MAX_AGE_MS = 30 * MINUTE_MS
const MAX_PROCESS_JOBS = 3
const MAX_PUBLISH_JOBS = 3
const SETTLED_PORTRAIT_RETENTION_MS = 24 * 60 * MINUTE_MS
const INCOMING_PREFIX = 'incoming/'

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
  storageDelete: StorageDeleteService
  queue: Pick<
    MediaQueue,
    'enqueueMediaProcess' | 'processJobHistory' | 'enqueueMediaPublish' | 'publishJobHistory'
  >
}

type StuckOutcome = 'waiting' | 'requeued' | 'failed'
type PublishRecovery = 'waiting' | 'requeued' | 'reverted'

interface DraftSweepCounts {
  draftsDeleted: number
  publishRecovered: number
}

/** Creates the use case cleaning abandoned uploads and recovering stuck processing. */
export function createMediaSweepService(deps: Deps): MediaSweepService {
  const { db, storage, clock, logger, queue, storageDelete } = deps

  const bestEffort = createBestEffort(logger)

  async function deleteDraft(row: draftRepository.DraftSweepRow): Promise<boolean> {
    const deleted = await runInTransaction(db, (tx) =>
      draftRepository.deleteDraftRows(tx, { uploadId: row.id, mediaId: row.mediaId }),
    )
    if (!deleted) return false
    const context = { uploadId: row.id }
    await bestEffort(context, 'Failed to delete the source of a swept draft', () =>
      storage.delete([row.objectKey]),
    )
    if (row.variantKeys.length > 0) {
      await bestEffort(context, 'Failed to delete the variants of a swept draft', () =>
        storageDelete.deleteObjects(row.variantKeys, { requestedAt: clock() }),
      )
    }
    return true
  }

  async function recoverPublish(row: draftRepository.DraftSweepRow): Promise<PublishRecovery> {
    const history = await queue.publishJobHistory(row.id)
    if (history.live > 0) return 'waiting'
    if (history.total < MAX_PUBLISH_JOBS) {
      await queue.enqueueMediaPublish({ uploadId: row.id })
      return 'requeued'
    }
    const stuckBefore = new Date(clock().getTime() - PUBLISH_STUCK_MS)
    if (!(await publishRepository.revertPublishing(db, row.id, stuckBefore))) return 'waiting'
    logger.warn({ uploadId: row.id, jobs: history.total }, 'Stuck publish sent back to staged')
    return 'reverted'
  }

  async function sweepDrafts(now: Date): Promise<DraftSweepCounts> {
    const rows = await draftRepository.findDraftSweepCandidates(db, {
      stagedBefore: new Date(now.getTime() - DRAFT_TTL_MS),
      now,
    })
    let draftsDeleted = 0
    let publishRecovered = 0
    for (const row of rows) {
      const verdict = classifyDraftForSweep({ ...row, hasOwner: row.userId !== null, now })
      try {
        if (verdict === 'delete' && (await deleteDraft(row))) draftsDeleted += 1
        if (verdict === 'recover-publish' && (await recoverPublish(row)) !== 'waiting') {
          publishRecovered += 1
        }
      } catch (error) {
        logger.error({ uploadId: row.id, verdict, err: error }, 'Failed to sweep a draft')
      }
    }
    return { draftsDeleted, publishRecovered }
  }

  async function sweepSettledPortraitUploads(now: Date): Promise<number> {
    const keys = await repository.deleteSettledPortraitUploads(
      db,
      new Date(now.getTime() - SETTLED_PORTRAIT_RETENTION_MS),
    )
    const incoming = keys.filter((key) => key.startsWith(INCOMING_PREFIX))
    if (incoming.length > 0) {
      await bestEffort({ count: incoming.length }, 'Failed to delete settled portrait sources', () =>
        storage.delete(incoming),
      )
    }
    return keys.length
  }

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
      const drafts = await sweepDrafts(clock())
      const portraitUploadsDeleted = await sweepSettledPortraitUploads(clock())
      const count = (kind: StuckOutcome) => outcomes.filter((outcome) => outcome === kind).length
      logger.info(
        {
          ...drafts,
          portraitUploadsDeleted,
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
