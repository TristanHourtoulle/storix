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
import { cardTitleSchema, type MediaVariant, type UploadRejectionReason } from '@storix/shared'
import { ObjectTooLargeError, type ObjectStorage } from '@storix/storage'
import type { RarityQueue } from '../../jobs/rarity-queue'
import type { WorkerLogger } from '../../lib/logger'
import { runInTransaction } from '../../lib/transaction'
import type { ImagePipeline, RenderedFile } from './image-pipeline'
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
  rarity: RarityQueue
}

interface DuplicateMatch {
  mediaId: string
  sourceSha256: string
}

interface RenderTrace {
  sha: string | null
  variantKeys: readonly string[]
}

type CommitOutcome =
  | { kind: 'ready'; cardId: string; number: number }
  | { kind: 'duplicate'; match: DuplicateMatch; rejected: boolean }

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
  const { db, storage, pipeline, clock, logger, rarity } = deps

  async function readSource(
    objectKey: string,
  ): Promise<{ buffer: Buffer } | { buffer: null; reason: string }> {
    try {
      const buffer = await storage.getBuffer(objectKey, UPLOAD_MAX_BYTES)
      return buffer === null ? { buffer: null, reason: 'MISSING_OBJECT' } : { buffer }
    } catch (error) {
      if (error instanceof ObjectTooLargeError) return { buffer: null, reason: 'TOO_LARGE' }
      throw error
    }
  }

  async function bestEffort(context: object, message: string, task: () => Promise<unknown>) {
    try {
      await task()
    } catch (error) {
      logger.error({ ...context, err: error }, message)
    }
  }

  async function reject(
    upload: repository.UploadForProcessing,
    reason: UploadRejectionReason,
  ): Promise<void> {
    const rejected = await repository.markUploadRejected(db, upload.id, reason, clock())
    await storage.delete([upload.objectKey])
    if (rejected) logger.info({ uploadId: upload.id, reason }, 'Upload rejected')
    else logger.info({ uploadId: upload.id }, 'Upload already settled by another job')
  }

  async function commit(
    upload: repository.UploadForProcessing,
    title: string,
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
        const rejected = await repository.markUploadRejected(tx, upload.id, 'DUPLICATE_PHOTO', now)
        return { kind: 'duplicate', match, rejected }
      }
      const mediaId = await repository.insertMedia(tx, row)
      const number = await repository.nextCardNumber(tx, upload.leagueId)
      const cardId = await repository.insertCard(tx, {
        leagueId: upload.leagueId,
        mediaId,
        authorId: upload.userId,
        number,
        title,
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
      if ((await repository.markUploadReady(tx, upload.id, cardId, now)) === 0) {
        throw new Error(`Upload ${upload.id} left processing before its card was committed`)
      }
      return { kind: 'ready', cardId, number }
    })
  }

  async function uploadVariants(
    upload: repository.UploadForProcessing,
    sha: string,
    files: readonly RenderedFile[],
    trace: RenderTrace,
  ): Promise<MediaVariant[]> {
    const entries = files.map((file) => ({
      file,
      variant: {
        size: file.size,
        format: file.format,
        key: mediaVariantKey({
          leagueId: upload.leagueId,
          sourceSha256: sha,
          size: file.size,
          format: file.format,
        }),
        width: file.width,
        height: file.height,
        bytes: file.body.length,
      },
    }))
    trace.variantKeys = entries.map((entry) => entry.variant.key)
    for (const { file, variant } of entries) {
      await storage.put({
        key: variant.key,
        body: file.body,
        contentType: file.contentType,
        cacheControl: VARIANT_CACHE_CONTROL,
      })
    }
    return entries.map((entry) => entry.variant)
  }

  async function process(upload: repository.UploadForProcessing, trace: RenderTrace) {
    const title = cardTitleSchema.safeParse(upload.title)
    if (!title.success) {
      logger.error({ uploadId: upload.id }, 'Upload has no valid title; failing without retries')
      await failUpload(upload, trace)
      return
    }
    const source = await readSource(upload.objectKey)
    if (source.buffer === null) {
      logger.debug({ uploadId: upload.id, reason: source.reason }, 'Upload source unavailable')
      await reject(upload, 'INVALID_IMAGE')
      return
    }
    const buffer = source.buffer
    const probe = await pipeline.probeJpeg(buffer)
    if (!probe.ok) {
      logger.debug(
        { uploadId: upload.id, reason: probe.reason, detail: probe.detail },
        'Upload is not a usable JPEG',
      )
      await reject(upload, 'INVALID_IMAGE')
      return
    }
    const sha = sha256Hex(buffer)
    trace.sha = sha
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
    const rendered = await pipeline.renderVariants(buffer)
    const variants = await uploadVariants(upload, sha, rendered.files, trace)

    const outcome = await commit(
      upload,
      title.data,
      {
        leagueId: upload.leagueId,
        uploadId: upload.id,
        sourceSha256: sha,
        phash,
        thumbhash: rendered.thumbhash,
        dominantColor: rendered.dominantColor,
        width: rendered.width,
        height: rendered.height,
        capturedAt: exifDate ?? clientDate,
        captureDateSource: exifDate ? 'exif' : clientDate ? 'client' : null,
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
        outcome.rejected
          ? 'Upload rejected as duplicate after lock'
          : 'Upload already settled by another job',
      )
      return
    }
    await storage.delete([upload.objectKey])
    await bestEffort({ leagueId: upload.leagueId }, 'Failed to enqueue rarity recompute', () =>
      rarity.enqueueRecompute({ leagueId: upload.leagueId }),
    )
    logger.info(
      { uploadId: upload.id, cardId: outcome.cardId, number: outcome.number },
      'Card created',
    )
  }

  async function failUpload(upload: repository.UploadForProcessing, trace: RenderTrace) {
    const context = { uploadId: upload.id }
    await bestEffort(context, 'Failed to mark upload failed', () =>
      repository.markUploadFailed(db, upload.id, clock()),
    )
    await bestEffort(context, 'Failed to delete incoming object of a failed upload', () =>
      storage.delete([upload.objectKey]),
    )
    const sha = trace.sha
    if (sha === null || trace.variantKeys.length === 0) return
    await bestEffort(context, 'Failed to delete variants of a failed upload', async () => {
      if (await repository.findMediaBySha(db, upload.leagueId, sha)) return
      await storage.delete(trace.variantKeys)
    })
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
      const trace: RenderTrace = { sha: null, variantKeys: [] }
      try {
        await process(upload, trace)
      } catch (error) {
        if (input.isFinalAttempt) {
          logger.error({ uploadId, err: error }, 'Upload processing failed for good')
          await failUpload(upload, trace)
        }
        throw error
      }
    },
  }
}
