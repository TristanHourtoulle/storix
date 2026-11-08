import { createHash } from 'node:crypto'
import type { Database, DbExecutor } from '@storix/db'
import {
  UPLOAD_MAX_BYTES,
  findDuplicate,
  hasEnoughDetailForDedup,
  mediaVariantKey,
  perceptualHash,
  sanitizeCaptureDate,
} from '@storix/shared/domain'
import {
  cardTitleSchema,
  type MediaVariant,
  type UploadRejectionReason,
  type UploadStatus,
} from '@storix/shared'
import { ObjectTooLargeError, type ObjectStorage } from '@storix/storage'
import type { RarityQueue } from '../../jobs/rarity-queue'
import { createBestEffort } from '../../lib/best-effort'
import type { WorkerLogger } from '../../lib/logger'
import { runInTransaction } from '../../lib/transaction'
import { insertCardForMedia } from './card-creation'
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

type DuplicateOutcome = { kind: 'duplicate'; match: DuplicateMatch; rejected: boolean }

type CommitOutcome =
  | { kind: 'ready'; cardId: string; number: number }
  | { kind: 'staged'; mediaId: string }
  | { kind: 'gone' }
  | DuplicateOutcome

const LEGACY_READY_FROM: readonly UploadStatus[] = ['uploaded', 'processing']

function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

async function findLeagueDuplicate(
  db: DbExecutor,
  input: { leagueId: string; sha: string; phash: string | null },
): Promise<DuplicateMatch | null> {
  const exact = await repository.findDuplicateBySha(db, input.leagueId, input.sha)
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

  const bestEffort = createBestEffort(logger)

  async function reject(
    upload: repository.UploadForProcessing,
    reason: UploadRejectionReason,
  ): Promise<void> {
    const rejected = await repository.markUploadRejected(db, upload.id, reason, clock())
    await storage.delete([upload.objectKey])
    if (rejected) logger.info({ uploadId: upload.id, reason }, 'Upload rejected')
    else logger.info({ uploadId: upload.id }, 'Upload already settled by another job')
  }

  async function rejectDuplicateUnderLock(
    tx: DbExecutor,
    upload: repository.OwnedUpload,
    row: repository.NewMediaRow,
    dedupable: boolean,
  ): Promise<DuplicateOutcome | null> {
    await repository.lockLeagueMedia(tx, upload.leagueId)
    const match = await findLeagueDuplicate(tx, {
      leagueId: upload.leagueId,
      sha: row.sourceSha256,
      phash: dedupable ? row.phash : null,
    })
    if (match === null) return null
    const rejected = await repository.markUploadRejected(tx, upload.id, 'DUPLICATE_PHOTO', clock())
    return { kind: 'duplicate', match, rejected }
  }

  async function commit(
    upload: repository.OwnedUpload,
    title: string | null,
    row: repository.NewMediaRow,
    dedupable: boolean,
  ): Promise<CommitOutcome> {
    return runInTransaction(db, async (tx) => {
      const duplicate = await rejectDuplicateUnderLock(tx, upload, row, dedupable)
      if (duplicate) return duplicate
      const now = clock()
      await repository.deleteDiscardedMediaBySha(tx, upload.leagueId, row.sourceSha256)
      if (title === null) {
        if (!(await repository.markUploadStaged(tx, upload.id, now))) return { kind: 'gone' }
        return { kind: 'staged', mediaId: await repository.insertMedia(tx, row) }
      }
      const mediaId = await repository.insertMedia(tx, row)
      const card = await insertCardForMedia(tx, {
        upload,
        mediaId,
        title,
        now,
        from: LEGACY_READY_FROM,
      })
      return { kind: 'ready', ...card }
    })
  }

  async function deleteOrphanVariants(
    upload: repository.CardUpload,
    sha: string,
    keys: readonly string[],
  ): Promise<void> {
    if (await repository.findMediaBySha(db, upload.leagueId, sha)) return
    await storage.delete(keys)
  }

  async function uploadVariants(
    upload: repository.CardUpload,
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

  function titleOf(
    upload: repository.OwnedUpload,
  ): { ok: true; title: string | null } | { ok: false } {
    if (upload.stageOnly) return { ok: true, title: null }
    const title = cardTitleSchema.safeParse(upload.title)
    return title.success ? { ok: true, title: title.data } : { ok: false }
  }

  async function process(upload: repository.OwnedUpload, trace: RenderTrace) {
    const title = titleOf(upload)
    if (!title.ok) {
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
    if (await repository.findDuplicateBySha(db, upload.leagueId, sha)) {
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
      title.title,
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
    if (outcome.kind === 'gone') {
      await deleteOrphanVariants(
        upload,
        sha,
        variants.map((variant) => variant.key),
      )
      await storage.delete([upload.objectKey])
      logger.info(
        { uploadId: upload.id },
        'Upload is gone (discarded) before staging; nothing kept',
      )
      return
    }
    if (outcome.kind === 'staged') {
      logger.info({ uploadId: upload.id, mediaId: outcome.mediaId }, 'Upload staged')
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
    if (sha === null || trace.variantKeys.length === 0 || !repository.isCardUpload(upload)) return
    await bestEffort(context, 'Failed to delete variants of a failed upload', () =>
      deleteOrphanVariants(upload, sha, trace.variantKeys),
    )
  }

  return {
    async processUpload(uploadId, input) {
      const upload = await repository.findUploadForProcessing(db, uploadId)
      if (upload === null) return
      const { userId } = upload
      if (TERMINAL_STATUSES.has(upload.status) || userId === null) {
        await storage.delete([upload.objectKey])
        return
      }
      if (!(await repository.markUploadProcessing(db, uploadId))) return
      const trace: RenderTrace = { sha: null, variantKeys: [] }
      if (!repository.isCardUpload(upload)) {
        logger.error({ uploadId, kind: upload.kind }, 'No processing path for this upload kind')
        await failUpload(upload, trace)
        return
      }
      try {
        await process({ ...upload, userId }, trace)
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
