import { randomUUID } from 'node:crypto'
import type { Database, DbExecutor } from '@storix/db'
import {
  checkUploadQuota,
  DEFAULT_UPLOAD_QUOTA_PER_DAY,
  remainingUploadQuota,
  sanitizeCaptureDate,
  UPLOAD_CONTENT_TYPE,
  UPLOAD_MAX_BYTES,
  UPLOAD_MIN_BYTES,
  UPLOAD_PRESIGN_TTL_SECONDS,
  uploadQuotaWindowStart,
  type CompleteUploadBody,
  type CreateUploadBody,
  type CreateUploadResponse,
  type UploadQuota,
  type UploadState,
} from '@storix/shared'
import type { ObjectStorage } from '@storix/storage'
import type { JobQueue } from '../../jobs/job-queue'
import { AppError, notFound } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import type { Membership } from '../leagues/leagues.service'
import { listMembers } from '../members/members.repository'
import {
  countUploadsSince,
  findUpload,
  insertUpload,
  lockMemberRow,
  markUploaded,
  type UploadRow,
} from './uploads.repository'

const UPLOAD_CACHE_CONTROL = 'no-store'

export interface UploadsService {
  getQuota(m: Membership): Promise<UploadQuota>
  createUpload(m: Membership, body: CreateUploadBody): Promise<CreateUploadResponse>
  completeUpload(m: Membership, uploadId: string, body: CompleteUploadBody): Promise<UploadState>
  getUploadState(m: Membership, uploadId: string): Promise<UploadState>
}

function toState(row: UploadRow): UploadState {
  return {
    uploadId: row.id,
    status: row.status,
    cardId: row.cardId,
    rejectionReason: row.rejectionReason,
  }
}

function countUsed(db: DbExecutor, m: Membership, now: Date): Promise<number> {
  return countUploadsSince(db, {
    leagueId: m.leagueId,
    userId: m.userId,
    since: uploadQuotaWindowStart(now),
    pendingSince: new Date(now.getTime() - UPLOAD_PRESIGN_TTL_SECONDS * 1000),
  })
}

/** Builds the uploads service handling presigned uploads, the daily quota and completion. */
export function createUploadsService(deps: {
  db: Database
  storage: ObjectStorage
  jobs: JobQueue
  clock: () => Date
}): UploadsService {
  const { db, storage, jobs, clock } = deps

  async function findOwnedUpload(m: Membership, uploadId: string): Promise<UploadRow> {
    const row = await findUpload(db, m.leagueId, uploadId)
    if (row === null || row.userId !== m.userId) throw notFound('Upload not found')
    return row
  }

  async function assertTaggedMembers(m: Membership, taggedUserIds: string[]): Promise<void> {
    if (taggedUserIds.length === 0) return
    const memberIds = new Set((await listMembers(db, m.leagueId)).map((row) => row.userId))
    if (taggedUserIds.some((id) => !memberIds.has(id))) {
      throw new AppError('VALIDATION_FAILED', 400, 'Tagged users must be league members', {
        field: 'taggedUserIds',
      })
    }
  }

  return {
    async getQuota(m) {
      const limit = DEFAULT_UPLOAD_QUOTA_PER_DAY
      const used = await countUsed(db, m, clock())
      return { limit, used, remaining: remainingUploadQuota({ limit, used }) }
    },

    async createUpload(m) {
      const now = clock()
      const uploadId = randomUUID()
      const objectKey = `incoming/${m.userId}/${uploadId}`
      const limit = DEFAULT_UPLOAD_QUOTA_PER_DAY
      await runInTransaction(db, async (tx) => {
        await lockMemberRow(tx, m.leagueId, m.userId)
        const used = await countUsed(tx, m, now)
        const quota = checkUploadQuota({ limit, used, requested: 1 })
        if (!quota.allowed) {
          throw new AppError('UPLOAD_QUOTA_EXCEEDED', 429, 'Daily upload quota exceeded', {
            limit,
            remaining: quota.remaining,
          })
        }
        await insertUpload(tx, { id: uploadId, leagueId: m.leagueId, userId: m.userId, objectKey })
      })
      const presigned = await storage.presignUpload({
        key: objectKey,
        contentType: UPLOAD_CONTENT_TYPE,
        minBytes: UPLOAD_MIN_BYTES,
        maxBytes: UPLOAD_MAX_BYTES,
        cacheControl: UPLOAD_CACHE_CONTROL,
        expiresInSeconds: UPLOAD_PRESIGN_TTL_SECONDS,
      })
      return {
        uploadId,
        url: presigned.url,
        fields: presigned.fields,
        expiresAt: new Date(now.getTime() + UPLOAD_PRESIGN_TTL_SECONDS * 1000).toISOString(),
      }
    },

    async completeUpload(m, uploadId, body) {
      const row = await findOwnedUpload(m, uploadId)
      if (row.status !== 'pending') return toState(row)
      await assertTaggedMembers(m, body.taggedUserIds)
      if ((await storage.head(row.objectKey)) === null) {
        throw new AppError('UPLOAD_NOT_READY', 409, 'The file has not been uploaded yet')
      }
      const now = clock()
      const capturedAt = body.capturedAt === null ? null : new Date(body.capturedAt)
      const marked = await markUploaded(db, {
        id: row.id,
        title: body.title,
        taggedUserIds: body.taggedUserIds,
        clientCapturedAt: sanitizeCaptureDate(capturedAt, now),
        now,
      })
      if (!marked) return toState(await findOwnedUpload(m, uploadId))
      await jobs.enqueueMediaProcess({ uploadId: row.id })
      return { uploadId: row.id, status: 'uploaded', cardId: null, rejectionReason: null }
    },

    async getUploadState(m, uploadId) {
      return toState(await findOwnedUpload(m, uploadId))
    },
  }
}
