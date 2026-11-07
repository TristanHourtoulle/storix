import { createHash } from 'node:crypto'
import type { Database, DbExecutor } from '@storix/db'
import {
  PROVISIONAL_TIER,
  UPLOAD_MAX_BYTES,
  findDuplicate,
  hasEnoughDetailForDedup,
  mediaVariantKey,
  perceptualHash,
  sanitizeCaptureDate,
} from '@storix/shared/domain'
import type { MediaVariant, UploadRejectionReason } from '@storix/shared'
import { ObjectTooLargeError, type ObjectStorage } from '@storix/storage'
import type { WorkerLogger } from '../../lib/logger'
import { runInTransaction } from '../../lib/transaction'
import type { ImagePipeline } from './image-pipeline'
import * as repository from './media.repository'

const VARIANT_CACHE_CONTROL = 'public, max-age=31536000, immutable'
const TERMINAL_STATUSES = new Set(['ready', 'rejected', 'failed'])

export interface MediaProcessingService {
  processUpload(uploadId: string, input: { isFinalAttempt: boolean }): Promise<void>
}

interface Deps {
  db: Database
  storage: ObjectStorage
  pipeline: ImagePipeline
  clock: () => Date
  logger: WorkerLogger
}

interface DuplicateMatch {
  mediaId: string
  sourceSha256: string
}

type CommitOutcome =
  { kind: 'ready'; cardId: string; number: number } | { kind: 'duplicate'; match: DuplicateMatch }

function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

async function findLeagueDuplicate(
  db: DbExecutor,
  input: { leagueId: string; sha: string; phash: string | null },
): Promise<DuplicateMatch | null> {
  const exact = await repository.findMediaBySha(db, input.leagueId, input.sha)
  if (exact) return exact
  if (input.phash === null) return null
  return findDuplicate(input.phash, await repository.listLeaguePhashes(db, input.leagueId))
}

/** Creates the use case turning an uploaded JPEG into card media. */
export function createMediaProcessingService(deps: Deps): MediaProcessingService {
  const { db, storage, pipeline, clock, logger } = deps

  async function readSource(objectKey: string): Promise<Buffer | null> {
    try {
      return await storage.getBuffer(objectKey, UPLOAD_MAX_BYTES)
    } catch (error) {
      if (error instanceof ObjectTooLargeError) return null
      throw error
    }
  }

  async function reject(
    upload: repository.UploadForProcessing,
    reason: UploadRejectionReason,
  ): Promise<void> {
    await repository.markUploadRejected(db, upload.id, reason, clock())
    await storage.delete([upload.objectKey])
    logger.info({ uploadId: upload.id, reason }, 'Upload rejected')
  }

  async function commit(
    upload: repository.UploadForProcessing,
    row: repository.NewMediaRow,
    dedupable: boolean,
  ): Promise<CommitOutcome> {
    return runInTransaction(db, async (tx) => {
      await repository.lockLeagueMedia(tx, upload.leagueId)
      const match = await findLeagueDuplicate(tx, {
        leagueId: upload.leagueId,
        sha: row.sourceSha256,
        phash: dedupable ? row.phash : null,
      })
      const now = clock()
      if (match) {
        await repository.markUploadRejected(tx, upload.id, 'DUPLICATE_PHOTO', now)
        return { kind: 'duplicate', match }
      }
      const mediaId = await repository.insertMedia(tx, row)
      const number = await repository.nextCardNumber(tx, upload.leagueId)
      if (upload.title === null) throw new Error(`Upload ${upload.id} has no title`)
      const cardId = await repository.insertCard(tx, {
        leagueId: upload.leagueId,
        mediaId,
        authorId: upload.userId,
        number,
        title: upload.title,
        tier: PROVISIONAL_TIER,
        isProvisional: true,
      })
      await repository.insertCardTags(tx, {
        cardId,
        leagueId: upload.leagueId,
        userIds: upload.taggedUserIds,
      })
      await repository.insertAuditEntry(tx, {
        leagueId: upload.leagueId,
        actorId: upload.userId,
        action: 'card.created',
        metadata: { cardId, number, uploadId: upload.id },
      })
      await repository.markUploadReady(tx, upload.id, cardId, now)
      return { kind: 'ready', cardId, number }
    })
  }

  async function process(upload: repository.UploadForProcessing): Promise<void> {
    const buffer = await readSource(upload.objectKey)
    if (buffer === null || (await pipeline.probeJpeg(buffer)) === null) {
      await reject(upload, 'INVALID_IMAGE')
      return
    }
    const sha = sha256Hex(buffer)
    if (await repository.findMediaBySha(db, upload.leagueId, sha)) {
      await reject(upload, 'DUPLICATE_PHOTO')
      return
    }
    const gray = await pipeline.grayscaleForHash(buffer)
    const phash = perceptualHash(gray)
    const dedupable = hasEnoughDetailForDedup(gray)
    if (
      dedupable &&
      findDuplicate(phash, await repository.listLeaguePhashes(db, upload.leagueId))
    ) {
      await reject(upload, 'DUPLICATE_PHOTO')
      return
    }

    const now = clock()
    const exifDate = sanitizeCaptureDate(await pipeline.readExifCaptureDate(buffer), now)
    const clientDate = sanitizeCaptureDate(upload.clientCapturedAt, now)
    const capturedAt = exifDate ?? clientDate
    const captureDateSource = exifDate ? 'exif' : clientDate ? 'client' : null

    const rendered = await pipeline.renderVariants(buffer)
    const variants: MediaVariant[] = []
    for (const file of rendered.files) {
      const key = mediaVariantKey({
        leagueId: upload.leagueId,
        sourceSha256: sha,
        size: file.size,
        format: file.format,
      })
      await storage.put({
        key,
        body: file.body,
        contentType: file.contentType,
        cacheControl: VARIANT_CACHE_CONTROL,
      })
      variants.push({
        size: file.size,
        format: file.format,
        key,
        width: file.width,
        height: file.height,
        bytes: file.body.length,
      })
    }

    const outcome = await commit(
      upload,
      {
        leagueId: upload.leagueId,
        uploadId: upload.id,
        sourceSha256: sha,
        phash,
        thumbhash: rendered.thumbhash,
        dominantColor: rendered.dominantColor,
        width: rendered.width,
        height: rendered.height,
        capturedAt,
        captureDateSource,
        variants,
      },
      dedupable,
    )

    if (outcome.kind === 'duplicate') {
      if (outcome.match.sourceSha256 !== sha) {
        await storage.delete(variants.map((variant) => variant.key))
      }
      await storage.delete([upload.objectKey])
      logger.info(
        { uploadId: upload.id, duplicateOf: outcome.match.mediaId },
        'Upload rejected as duplicate after lock',
      )
      return
    }
    await storage.delete([upload.objectKey])
    logger.info(
      { uploadId: upload.id, cardId: outcome.cardId, number: outcome.number },
      'Card created',
    )
  }

  async function fail(upload: repository.UploadForProcessing): Promise<void> {
    await storage.delete([upload.objectKey])
    await repository.markUploadFailed(db, upload.id, clock())
  }

  return {
    async processUpload(uploadId, input) {
      const upload = await repository.findUploadForProcessing(db, uploadId)
      if (upload === null) return
      if (TERMINAL_STATUSES.has(upload.status)) {
        await storage.delete([upload.objectKey])
        return
      }
      if (!(await repository.markUploadProcessing(db, uploadId))) return
      try {
        await process(upload)
      } catch (error) {
        if (input.isFinalAttempt) {
          logger.error({ uploadId, err: error }, 'Upload processing failed for good')
          await fail(upload)
        }
        throw error
      }
    },
  }
}
