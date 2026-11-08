import { randomUUID } from 'node:crypto'
import type { Database, DbExecutor } from '@storix/db'
import {
  MAX_PUBLISH_BATCH,
  checkUploadQuota,
  isUploadQuotaExempt,
  isUploadReservationExpired,
  resolveLeagueSettings,
  resolveUploadQuota,
  sanitizeCaptureDate,
  UPLOAD_CONTENT_TYPE,
  UPLOAD_MAX_BYTES,
  UPLOAD_MIN_BYTES,
  UPLOAD_PRESIGN_TTL_SECONDS,
  uploadQuotaWindowStart,
  uploadReservationCutoff,
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
import { findLeagueSettings } from '../leagues/leagues.repository'
import type { Membership } from '../leagues/leagues.service'
import { assertTaggedMembers } from './assert-tagged-members'
import { toUploadState } from './upload-state'
import {
  countOpenDrafts,
  countUploadsSince,
  findUpload,
  insertUpload,
  lockMemberRole,
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

function countUsed(db: DbExecutor, m: Membership, now: Date): Promise<number> {
  return countUploadsSince(db, {
    leagueId: m.leagueId,
    userId: m.userId,
    since: uploadQuotaWindowStart(now),
    pendingSince: uploadReservationCutoff(now),
  })
}

async function quotaLimitOf(db: DbExecutor, leagueId: string): Promise<number> {
  return resolveLeagueSettings(await findLeagueSettings(db, leagueId)).uploadQuotaPerDay
}

async function assertQuotaAvailable(db: DbExecutor, m: Membership, now: Date): Promise<void> {
  const limit = await quotaLimitOf(db, m.leagueId)
  const used = await countUsed(db, m, now)
  const quota = checkUploadQuota({ limit, used, requested: 1 })
  if (!quota.allowed) {
    throw new AppError('UPLOAD_QUOTA_EXCEEDED', 429, 'Daily upload quota exceeded', {
      limit,
      remaining: quota.remaining,
    })
  }
}

async function assertBatchAvailable(db: DbExecutor, m: Membership, now: Date): Promise<void> {
  const open = await countOpenDrafts(db, {
    leagueId: m.leagueId,
    userId: m.userId,
    pendingSince: uploadReservationCutoff(now),
  })
  if (open >= MAX_PUBLISH_BATCH) {
    throw new AppError('UPLOAD_QUOTA_EXCEEDED', 429, 'Open draft batch is full', {
      limit: MAX_PUBLISH_BATCH,
      remaining: 0,
      batch: true,
    })
  }
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

  return {
    async getQuota(m) {
      const limit = await quotaLimitOf(db, m.leagueId)
      const used = await countUsed(db, m, clock())
      return resolveUploadQuota({ role: m.role, limit, used })
    },

    async createUpload(m) {
      const now = clock()
      const uploadId = randomUUID()
      const objectKey = `incoming/${m.userId}/${uploadId}`
      const presigned = await storage.presignUpload({
        key: objectKey,
        contentType: UPLOAD_CONTENT_TYPE,
        minBytes: UPLOAD_MIN_BYTES,
        maxBytes: UPLOAD_MAX_BYTES,
        cacheControl: UPLOAD_CACHE_CONTROL,
        expiresInSeconds: UPLOAD_PRESIGN_TTL_SECONDS,
      })
      await runInTransaction(db, async (tx) => {
        const role = await lockMemberRole(tx, m.leagueId, m.userId)
        if (role === null) throw notFound()
        if (isUploadQuotaExempt(role)) await assertBatchAvailable(tx, m, now)
        else await assertQuotaAvailable(tx, m, now)
        await insertUpload(tx, { id: uploadId, leagueId: m.leagueId, userId: m.userId, objectKey })
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
      if (row.status !== 'pending') return toUploadState(row)
      const now = clock()
      if (isUploadReservationExpired(row.createdAt, now)) {
        throw new AppError('UPLOAD_EXPIRED', 410, 'The upload reservation has expired')
      }
      const taggedUserIds = body.taggedUserIds ?? []
      await assertTaggedMembers(db, m.leagueId, taggedUserIds)
      if ((await storage.head(row.objectKey)) === null) {
        throw new AppError('UPLOAD_NOT_READY', 409, 'The file has not been uploaded yet')
      }
      const capturedAt = body.capturedAt === null ? null : new Date(body.capturedAt)
      const marked = await markUploaded(db, {
        id: row.id,
        title: body.title ?? null,
        taggedUserIds,
        clientCapturedAt: sanitizeCaptureDate(capturedAt, now),
        stageOnly: body.title === undefined,
        now,
      })
      if (!marked) return toUploadState(await findOwnedUpload(m, uploadId))
      await jobs.enqueueMediaProcess({ uploadId: row.id })
      return { uploadId: row.id, status: 'uploaded', cardId: null, rejectionReason: null }
    },

    async getUploadState(m, uploadId) {
      return toUploadState(await findOwnedUpload(m, uploadId))
    },
  }
}
