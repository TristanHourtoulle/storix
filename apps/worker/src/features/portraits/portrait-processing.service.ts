import {
  canManageLeaguePhoto,
  portraitVariantKey,
  storedPortraitKeys,
  type PortraitKind,
  type PortraitOwner,
} from '@storix/shared/domain'
import type { UploadRejectionReason } from '@storix/shared'
import type { Database, DbExecutor, StoredPortrait } from '@storix/db'
import type { ObjectStorage } from '@storix/storage'
import { createBestEffort } from '../../lib/best-effort'
import type { WorkerLogger } from '../../lib/logger'
import { runInTransaction } from '../../lib/transaction'
import type { ImagePipeline } from '../media/image-pipeline'
import { readUploadSource } from '../media/upload-source'
import type { StorageDeleteService } from '../storage/storage-delete.service'
import { renderPortrait, type RenderedPortraitFile } from './portrait-render.service'
import * as repository from './portraits.repository'

const PORTRAIT_CACHE_CONTROL = 'public, max-age=31536000, immutable'

export interface PortraitUpload {
  id: string
  kind: PortraitKind
  ownerId: string
  userId: string
  leagueId: string | null
  objectKey: string
}

export interface PortraitProcessingService {
  processUpload(upload: PortraitUpload, input: { isFinalAttempt: boolean }): Promise<void>
}

interface Deps {
  db: Database
  storage: ObjectStorage
  pipeline: Pick<ImagePipeline, 'probeJpeg'>
  clock: () => Date
  logger: WorkerLogger
  storageDelete: StorageDeleteService
}

type CommitOutcome =
  | { kind: 'ready'; previous: StoredPortrait | null }
  | { kind: 'settled' }
  | { kind: 'vanished' }
  | { kind: 'not_allowed' }

/** Builds the portrait view of an upload; null for a league upload without a league. */
export function toPortraitUpload(input: {
  id: string
  kind: PortraitKind
  userId: string
  leagueId: string | null
  objectKey: string
}): PortraitUpload | null {
  const ownerId = input.kind === 'avatar' ? input.userId : input.leagueId
  return ownerId === null ? null : { ...input, ownerId }
}

function ownerOf(upload: PortraitUpload): PortraitOwner {
  return { kind: upload.kind, ownerId: upload.ownerId }
}

function renderedKeysOf(upload: PortraitUpload): string[] {
  return storedPortraitKeys({ ...ownerOf(upload), uploadId: upload.id })
}

/** Creates the use case turning an uploaded JPEG into the owner's single current portrait. */
export function createPortraitProcessingService(deps: Deps): PortraitProcessingService {
  const { db, storage, pipeline, clock, logger, storageDelete } = deps
  const bestEffort = createBestEffort(logger)

  async function reject(upload: PortraitUpload, reason: UploadRejectionReason): Promise<void> {
    const rejected = await repository.markUploadRejected(db, upload.id, reason, clock())
    await storage.delete([upload.objectKey])
    if (rejected) logger.info({ uploadId: upload.id, reason }, 'Portrait upload rejected')
    else logger.info({ uploadId: upload.id }, 'Portrait upload already settled by another job')
  }

  async function putFiles(upload: PortraitUpload, files: readonly RenderedPortraitFile[]) {
    for (const file of files) {
      await storage.put({
        key: portraitVariantKey({ ...ownerOf(upload), uploadId: upload.id, size: file.size }),
        body: file.body,
        contentType: file.contentType,
        cacheControl: PORTRAIT_CACHE_CONTROL,
      })
    }
  }

  async function isAllowed(tx: DbExecutor, upload: PortraitUpload): Promise<boolean> {
    if (upload.kind === 'avatar') return true
    const role = await repository.lockMemberRoleForShare(tx, upload.ownerId, upload.userId)
    return role !== null && canManageLeaguePhoto(role)
  }

  function lockOwnerRow(tx: DbExecutor, upload: PortraitUpload): Promise<boolean> {
    return upload.kind === 'avatar'
      ? repository.lockUserRow(tx, upload.ownerId)
      : repository.lockLeagueRow(tx, upload.ownerId)
  }

  async function replacePortrait(
    tx: DbExecutor,
    upload: PortraitUpload,
    dominantColor: string,
  ): Promise<StoredPortrait | null> {
    const now = clock()
    const previous = await repository.findPortraitForOwner(tx, ownerOf(upload), { lock: true })
    if (previous !== null) await repository.deletePortraitAndUpload(tx, previous)
    await repository.insertPortrait(tx, {
      kind: upload.kind,
      userId: upload.kind === 'avatar' ? upload.ownerId : null,
      leagueId: upload.kind === 'league' ? upload.ownerId : null,
      uploadId: upload.id,
      dominantColor,
    })
    if (!(await repository.markPortraitUploadReady(tx, upload.id, now))) {
      throw new Error(`Portrait upload ${upload.id} left processing under its row lock`)
    }
    await repository.insertAuditEntry(
      tx,
      upload.kind === 'avatar'
        ? {
            leagueId: null,
            actorId: upload.userId,
            targetUserId: upload.userId,
            action: 'account.avatar_changed',
            metadata: { uploadId: upload.id },
          }
        : {
            leagueId: upload.ownerId,
            actorId: upload.userId,
            action: 'league.photo_changed',
            metadata: { uploadId: upload.id },
          },
    )
    return previous
  }

  function commit(upload: PortraitUpload, dominantColor: string): Promise<CommitOutcome> {
    return runInTransaction(db, async (tx) => {
      const allowed = await isAllowed(tx, upload)
      const status = await repository.lockUploadStatus(tx, upload.id)
      if (status === null) return { kind: 'vanished' }
      if (status !== 'processing') return { kind: 'settled' }
      if (!allowed) {
        await repository.markUploadRejected(tx, upload.id, 'NOT_ALLOWED', clock())
        return { kind: 'not_allowed' }
      }
      if (!(await lockOwnerRow(tx, upload))) return { kind: 'vanished' }
      return { kind: 'ready', previous: await replacePortrait(tx, upload, dominantColor) }
    })
  }

  async function settle(upload: PortraitUpload, outcome: CommitOutcome): Promise<void> {
    const context = { uploadId: upload.id, kind: upload.kind }
    if (outcome.kind === 'settled') {
      logger.info(context, 'Portrait upload already settled by another job')
      return
    }
    if (outcome.kind !== 'ready') {
      await storage.delete([...renderedKeysOf(upload), upload.objectKey])
      logger.info(
        context,
        outcome.kind === 'not_allowed'
          ? 'Portrait upload rejected: the uploader may no longer change the league photo'
          : 'Portrait owner or upload is gone; nothing kept',
      )
      return
    }
    await storage.delete([upload.objectKey])
    const { previous } = outcome
    if (previous !== null) {
      await bestEffort(context, 'Failed to delete the previous portrait objects', () =>
        storageDelete.deleteObjects(repository.portraitKeysOf(previous), { requestedAt: clock() }),
      )
    }
    logger.info({ ...context, replaced: previous !== null }, 'Portrait updated')
  }

  async function process(upload: PortraitUpload): Promise<void> {
    const source = await readUploadSource(storage, upload.objectKey)
    if (source.buffer === null) {
      logger.debug({ uploadId: upload.id, reason: source.reason }, 'Portrait source unavailable')
      await reject(upload, 'INVALID_IMAGE')
      return
    }
    const probe = await pipeline.probeJpeg(source.buffer)
    if (!probe.ok) {
      logger.debug({ uploadId: upload.id, reason: probe.reason }, 'Portrait is not a usable JPEG')
      await reject(upload, 'INVALID_IMAGE')
      return
    }
    const rendered = await renderPortrait(source.buffer)
    await putFiles(upload, rendered.files)
    await settle(upload, await commit(upload, rendered.dominantColor))
  }

  async function fail(upload: PortraitUpload): Promise<void> {
    const context = { uploadId: upload.id }
    await bestEffort(context, 'Failed to mark portrait upload failed', () =>
      repository.markUploadFailed(db, upload.id, clock()),
    )
    await bestEffort(context, 'Failed to delete incoming object of a failed portrait', () =>
      storage.delete([upload.objectKey]),
    )
    await bestEffort(
      context,
      'Failed to delete rendered objects of a failed portrait',
      async () => {
        if (await repository.hasPortraitForUpload(db, upload.id)) return
        await storage.delete(renderedKeysOf(upload))
      },
    )
  }

  return {
    async processUpload(upload, input) {
      try {
        await process(upload)
      } catch (error) {
        if (input.isFinalAttempt) {
          logger.error({ uploadId: upload.id, err: error }, 'Portrait processing failed for good')
          await fail(upload)
        }
        throw error
      }
    },
  }
}
