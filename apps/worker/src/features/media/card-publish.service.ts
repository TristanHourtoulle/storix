import type { Database, DbExecutor } from '@storix/db'
import {
  CARD_CROP_FRAME,
  UPLOAD_MAX_BYTES,
  canonicalCrop,
  isCropRectValid,
  mediaCropVariantKey,
  mediaVariantKey,
  type CropRect,
} from '@storix/shared/domain'
import { cardTitleSchema, type MediaVariant } from '@storix/shared'
import type { ObjectStorage } from '@storix/storage'
import type { RarityQueue } from '../../jobs/rarity-queue'
import { createBestEffort } from '../../lib/best-effort'
import type { WorkerLogger } from '../../lib/logger'
import { runInTransaction } from '../../lib/transaction'
import { insertCardForMedia } from './card-creation'
import * as publishRepository from './card-publish.repository'
import { cropIdOf, renderCroppedVariants } from './crop-render'
import * as repository from './media.repository'

const VARIANT_CACHE_CONTROL = 'public, max-age=31536000, immutable'
const FALLBACK_SOURCE = { size: 1600, format: 'webp' } as const

export interface CardPublishService {
  publishUpload(uploadId: string, input: { isFinalAttempt: boolean }): Promise<void>
}

interface Deps {
  db: Database
  storage: ObjectStorage
  clock: () => Date
  logger: WorkerLogger
  rarity: RarityQueue
  renderCrop?: typeof renderCroppedVariants
}

type PublishMedia = publishRepository.PublishMedia
type PublishRow = publishRepository.PublishRow

interface Display {
  variants: MediaVariant[]
  crop: CropRect | null
}

function sameCrop(a: CropRect | null, b: CropRect | null): boolean {
  if (a === null || b === null) return a === b
  return canonicalCrop(a) === canonicalCrop(b)
}

/** Creates the use case turning a publishing upload into its card, idempotently. */
export function createCardPublishService(deps: Deps): CardPublishService {
  const { db, storage, clock, logger, rarity } = deps
  const renderCrop = deps.renderCrop ?? renderCroppedVariants

  const bestEffort = createBestEffort(logger)

  function effectiveCrop(upload: PublishRow, media: PublishMedia): CropRect | null {
    if (upload.hasInvalidCrop) {
      logger.warn({ uploadId: upload.id }, 'Stored crop is unreadable; publishing the full frame')
    }
    const crop = upload.crop
    if (crop === null) return null
    if (isCropRectValid(crop, media, CARD_CROP_FRAME)) return crop
    logger.warn({ uploadId: upload.id }, 'Crop does not fit the media; publishing the full frame')
    return null
  }

  async function readCropSource(upload: PublishRow, media: PublishMedia): Promise<Buffer> {
    const source = await storage.getBuffer(upload.objectKey, UPLOAD_MAX_BYTES)
    if (source !== null) return source
    const fallbackKey = mediaVariantKey({
      leagueId: upload.leagueId,
      sourceSha256: media.sourceSha256,
      ...FALLBACK_SOURCE,
    })
    const fallback = await storage.getBuffer(fallbackKey, UPLOAD_MAX_BYTES)
    if (fallback === null) throw new Error(`No source left to crop upload ${upload.id}`)
    logger.warn({ uploadId: upload.id }, 'Upload source is gone; cropping the 1600 WebP variant')
    return fallback
  }

  async function renderAndStore(
    upload: PublishRow,
    media: PublishMedia,
    crop: CropRect,
  ): Promise<MediaVariant[]> {
    const files = await renderCrop(await readCropSource(upload, media), crop)
    const cropId = cropIdOf(crop)
    const variants = files.map((file) => ({
      size: file.size,
      format: file.format,
      key: mediaCropVariantKey({
        leagueId: upload.leagueId,
        sourceSha256: media.sourceSha256,
        cropId,
        size: file.size,
        format: file.format,
      }),
      width: file.width,
      height: file.height,
      bytes: file.body.length,
    }))
    for (const [index, file] of files.entries()) {
      const variant = variants[index]
      if (variant === undefined) continue
      await storage.put({
        key: variant.key,
        body: file.body,
        contentType: file.contentType,
        cacheControl: VARIANT_CACHE_CONTROL,
      })
    }
    return variants
  }

  async function displayFor(
    upload: PublishRow,
    media: PublishMedia,
    isFinalAttempt: boolean,
  ): Promise<Display | null> {
    const crop = effectiveCrop(upload, media)
    if (sameCrop(crop, media.crop)) return null
    if (crop === null) return { variants: media.variants, crop: null }
    try {
      return { variants: await renderAndStore(upload, media, crop), crop }
    } catch (error) {
      if (!isFinalAttempt) throw error
      logger.error({ uploadId: upload.id, err: error }, 'Crop render failed for good; full frame')
      return media.crop === null ? null : { variants: media.variants, crop: null }
    }
  }

  type CommitOutcome =
    | { kind: 'published'; cardId: string; number: number }
    | { kind: 'skipped' }
    | { kind: 'withdrawn' }

  async function withdraw(tx: DbExecutor, uploadId: string): Promise<CommitOutcome> {
    await publishRepository.discardPublishing(tx, uploadId, clock())
    return { kind: 'withdrawn' }
  }

  async function commit(upload: PublishRow, display: Display | null): Promise<CommitOutcome> {
    return runInTransaction(db, async (tx) => {
      await repository.lockLeagueMedia(tx, upload.leagueId)
      const { userId } = upload
      if (userId === null) return withdraw(tx, upload.id)
      const isMember = await publishRepository.lockAuthorMembership(tx, {
        leagueId: upload.leagueId,
        userId,
      })
      if (!isMember) return withdraw(tx, upload.id)
      const locked = await publishRepository.lockUploadForPublish(tx, upload.id)
      if (locked === null || locked.status !== 'publishing') return { kind: 'skipped' }
      if (locked.userId !== userId || locked.media === null) return { kind: 'skipped' }
      if (!sameCrop(locked.crop, upload.crop)) {
        throw new Error(`Crop of upload ${upload.id} changed during its publish render`)
      }
      const title = cardTitleSchema.safeParse(locked.title)
      if (!title.success) throw new Error(`Publishing upload ${upload.id} has no valid title`)
      const mediaId = locked.media.id
      if (display !== null) {
        await publishRepository.updateMediaDisplay(tx, { mediaId, ...display })
      }
      const card = await insertCardForMedia(tx, {
        upload: { ...locked, userId },
        mediaId,
        title: title.data,
        now: clock(),
        from: ['publishing'],
      })
      return { kind: 'published', ...card }
    })
  }

  async function dropRenderedCrop(
    upload: PublishRow,
    media: PublishMedia,
    display: Display | null,
  ) {
    const crop = display?.crop ?? null
    if (crop === null || sameCrop(crop, media.crop)) return
    await bestEffort({ uploadId: upload.id }, 'Failed to delete an unused crop render', () =>
      storage.delete(display?.variants.map((variant) => variant.key) ?? []),
    )
  }

  return {
    async publishUpload(uploadId, input) {
      const upload = await publishRepository.findUploadForPublish(db, uploadId)
      if (upload === null || upload.status === 'ready') return
      const { media } = upload
      if (upload.status !== 'publishing' || media === null) {
        logger.warn(
          { uploadId, status: upload.status },
          'Skipping publish of a non-publishing upload',
        )
        return
      }
      const display =
        upload.userId === null ? null : await displayFor(upload, media, input.isFinalAttempt)
      const card = await commit(upload, display)
      if (card.kind !== 'published') {
        if (card.kind === 'withdrawn') await dropRenderedCrop(upload, media, display)
        logger.info(
          { uploadId, outcome: card.kind },
          card.kind === 'withdrawn'
            ? 'Author is no longer a member; publishing upload discarded'
            : 'Upload already published or withdrawn; nothing to do',
        )
        return
      }
      const context = { uploadId, leagueId: upload.leagueId }
      await bestEffort(context, 'Failed to delete the source of a published upload', () =>
        storage.delete([upload.objectKey]),
      )
      await bestEffort(context, 'Failed to enqueue rarity recompute', () =>
        rarity.enqueueRecompute({ leagueId: upload.leagueId }),
      )
      logger.info(
        {
          uploadId,
          cardId: card.cardId,
          number: card.number,
          cropped: (display ?? media).crop !== null,
        },
        'Card published',
      )
    },
  }
}
