import { randomUUID } from 'node:crypto'
import type { Database, DbExecutor } from '@storix/db'
import {
  isUploadReservationExpired,
  UPLOAD_CONTENT_TYPE,
  UPLOAD_MAX_BYTES,
  UPLOAD_MIN_BYTES,
  UPLOAD_PRESIGN_TTL_SECONDS,
  type CreateUploadBody,
  type CreateUploadResponse,
  type PortraitOwner,
  type UploadState,
} from '@storix/shared'
import type { ObjectStorage } from '@storix/storage'
import type { JobQueue } from '../../jobs/job-queue'
import type { ErrorLogger } from '../../lib/error-logger'
import { AppError, notFound } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import { insertAuditEntry, type AuditEntry } from '../audit/audit.repository'
import type { Membership } from '../leagues/leagues.service'
import { toUploadState } from '../uploads/upload-state'
import type { UploadRow } from '../uploads/uploads.repository'
import {
  deletePortraitAndUpload,
  findPortraitForOwner,
  findPortraitUpload,
  insertPortraitUpload,
  lockLeagueRow,
  lockUserRow,
  markPortraitUploaded,
  portraitKeysOf,
} from './portraits.repository'

const UPLOAD_CACHE_CONTROL = 'no-store'

export type PortraitTarget =
  | { kind: 'avatar'; userId: string }
  | { kind: 'league'; leagueId: string; userId: string }

export interface PortraitsService {
  createUpload(target: PortraitTarget, body: CreateUploadBody): Promise<CreateUploadResponse>
  completeUpload(target: PortraitTarget, uploadId: string): Promise<UploadState>
  getUploadState(target: PortraitTarget, uploadId: string): Promise<UploadState>
  removeAvatar(userId: string): Promise<void>
  removeLeaguePhoto(m: Membership): Promise<void>
}

export interface PortraitsServiceDeps {
  db: Database
  storage: ObjectStorage
  jobs: JobQueue
  clock: () => Date
  logger: ErrorLogger
}

interface Removal {
  owner: PortraitOwner
  lockOwner: (tx: DbExecutor) => Promise<boolean>
  audit: Omit<AuditEntry, 'metadata'>
}

function leagueIdOf(target: PortraitTarget): string | null {
  return target.kind === 'league' ? target.leagueId : null
}

/** Builds the avatar and league photo upload and removal use cases. */
export function createPortraitsService(deps: PortraitsServiceDeps): PortraitsService {
  const { db, storage, jobs, clock, logger } = deps

  async function findOwnedUpload(target: PortraitTarget, uploadId: string): Promise<UploadRow> {
    const row = await findPortraitUpload(db, {
      uploadId,
      kind: target.kind,
      userId: target.userId,
      leagueId: leagueIdOf(target),
    })
    if (row === null) throw notFound('Upload not found')
    return row
  }

  async function remove(removal: Removal): Promise<void> {
    const removed = await runInTransaction(db, async (tx) => {
      if (!(await removal.lockOwner(tx))) throw notFound()
      const current = await findPortraitForOwner(tx, removal.owner, { lock: true })
      if (current === null) return null
      await deletePortraitAndUpload(tx, current)
      await insertAuditEntry(tx, { ...removal.audit, metadata: { uploadId: current.uploadId } })
      return current
    })
    if (removed === null) return
    try {
      await jobs.enqueueStorageDelete(portraitKeysOf(removed))
    } catch (error) {
      logger.error(
        { err: error, kind: removed.kind, ownerId: removed.ownerId, uploadId: removed.uploadId },
        'Failed to enqueue removed portrait files deletion',
      )
    }
  }

  return {
    async createUpload(target) {
      const now = clock()
      const uploadId = randomUUID()
      const objectKey = `incoming/${target.userId}/${uploadId}`
      const presigned = await storage.presignUpload({
        key: objectKey,
        contentType: UPLOAD_CONTENT_TYPE,
        minBytes: UPLOAD_MIN_BYTES,
        maxBytes: UPLOAD_MAX_BYTES,
        cacheControl: UPLOAD_CACHE_CONTROL,
        expiresInSeconds: UPLOAD_PRESIGN_TTL_SECONDS,
      })
      await insertPortraitUpload(db, {
        id: uploadId,
        kind: target.kind,
        leagueId: leagueIdOf(target),
        userId: target.userId,
        objectKey,
      })
      return {
        uploadId,
        url: presigned.url,
        fields: presigned.fields,
        expiresAt: new Date(now.getTime() + UPLOAD_PRESIGN_TTL_SECONDS * 1000).toISOString(),
      }
    },

    async completeUpload(target, uploadId) {
      const row = await findOwnedUpload(target, uploadId)
      if (row.status !== 'pending') return toUploadState(row)
      const now = clock()
      if (isUploadReservationExpired(row.createdAt, now)) {
        throw new AppError('UPLOAD_EXPIRED', 410, 'The upload reservation has expired')
      }
      if ((await storage.head(row.objectKey)) === null) {
        throw new AppError('UPLOAD_NOT_READY', 409, 'The file has not been uploaded yet')
      }
      if (!(await markPortraitUploaded(db, { id: row.id, now }))) {
        return toUploadState(await findOwnedUpload(target, uploadId))
      }
      await jobs.enqueueMediaProcess({ uploadId: row.id })
      return { uploadId: row.id, status: 'uploaded', cardId: null, rejectionReason: null }
    },

    async getUploadState(target, uploadId) {
      return toUploadState(await findOwnedUpload(target, uploadId))
    },

    removeAvatar(userId) {
      return remove({
        owner: { kind: 'avatar', ownerId: userId },
        lockOwner: (tx) => lockUserRow(tx, userId),
        audit: {
          leagueId: null,
          actorId: userId,
          targetUserId: userId,
          action: 'account.avatar_removed',
        },
      })
    },

    removeLeaguePhoto(m) {
      return remove({
        owner: { kind: 'league', ownerId: m.leagueId },
        lockOwner: (tx) => lockLeagueRow(tx, m.leagueId),
        audit: {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId: null,
          action: 'league.photo_removed',
        },
      })
    },
  }
}
