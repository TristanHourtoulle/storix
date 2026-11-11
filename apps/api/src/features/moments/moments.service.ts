import { randomUUID } from 'node:crypto'
import type { Database } from '@storix/db'
import {
  isUploadReservationExpired,
  momentLateMinutes,
  momentRewardDust,
  sanitizeCaptureDate,
  targetMoment,
  UPLOAD_CONTENT_TYPE,
  UPLOAD_MAX_BYTES,
  UPLOAD_MIN_BYTES,
  UPLOAD_PRESIGN_TTL_SECONDS,
  type CreateMomentUploadsResponse,
  type CurrentMoment,
  type MomentSlot,
  type PostMomentBody,
  type PostMomentResponse,
} from '@storix/shared'
import type { ObjectStorage } from '@storix/storage'
import type { JobQueue } from '../../jobs/job-queue'
import { AppError, notFound } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import type { EmblemAwards } from '../emblems/emblems.service'
import type { Membership } from '../leagues/leagues.service'
import { lockMemberRole } from '../uploads/uploads.repository'
import {
  completeMomentUploads,
  countMomentReservationsSince,
  creditMomentReward,
  findMemberPost,
  insertMomentPost,
  insertMomentUploads,
  lockMemberUpload,
  type MomentPostRow,
  type MomentUploadRow,
} from './moments.repository'

const UPLOAD_CACHE_CONTROL = 'no-store'
const MAX_RESERVATIONS_PER_HOUR = 12
const HOUR_MS = 3_600_000

const MOMENT_TITLE_DATE = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  day: 'numeric',
  month: 'long',
})

export interface MomentsService {
  getCurrent(m: Membership): Promise<CurrentMoment>
  createUploads(m: Membership): Promise<CreateMomentUploadsResponse>
  post(m: Membership, body: PostMomentBody): Promise<PostMomentResponse>
}

/** Returns the card title of a Moment, e.g. "Moment du 11 novembre". */
export function momentCardTitle(slot: MomentSlot): string {
  return `Moment du ${MOMENT_TITLE_DATE.format(slot.firesAt)}`
}

function toPostView(post: MomentPostRow): CurrentMoment['post'] {
  return {
    takenAt: post.takenAt.toISOString(),
    lateMinutes: post.lateMinutes,
    rewardDust: post.rewardDust,
  }
}

function alreadyPosted(): AppError {
  return new AppError('MOMENT_ALREADY_POSTED', 409, 'This Moment was already posted')
}

function assertPendingUpload(
  row: MomentUploadRow | null,
  input: { kind: 'card' | 'selfie'; now: Date },
): MomentUploadRow {
  if (row === null || row.kind !== input.kind) throw notFound('Upload not found')
  if (input.kind === 'card' && !row.isMoment) throw notFound('Upload not found')
  if (row.status !== 'pending') throw alreadyPosted()
  if (isUploadReservationExpired(row.createdAt, input.now)) {
    throw new AppError('UPLOAD_EXPIRED', 410, 'The upload reservation has expired')
  }
  return row
}

/** Builds the Moment service: the target Moment, its two-camera upload reservation and the post itself. */
export function createMomentsService(deps: {
  db: Database
  storage: ObjectStorage
  jobs: JobQueue
  emblems: EmblemAwards
  clock: () => Date
}): MomentsService {
  const { db, storage, jobs, emblems, clock } = deps

  async function presign(m: Membership, uploadId: string) {
    const objectKey = `incoming/${m.userId}/${uploadId}`
    const presigned = await storage.presignUpload({
      key: objectKey,
      contentType: UPLOAD_CONTENT_TYPE,
      minBytes: UPLOAD_MIN_BYTES,
      maxBytes: UPLOAD_MAX_BYTES,
      cacheControl: UPLOAD_CACHE_CONTROL,
      expiresInSeconds: UPLOAD_PRESIGN_TTL_SECONDS,
    })
    return { objectKey, presigned }
  }

  async function assertObjectsUploaded(rows: readonly MomentUploadRow[]): Promise<void> {
    for (const row of rows) {
      if ((await storage.head(row.objectKey)) === null) {
        throw new AppError('UPLOAD_NOT_READY', 409, 'The file has not been uploaded yet')
      }
    }
  }

  return {
    async getCurrent(m) {
      const slot = targetMoment(m.leagueId, clock())
      const post = await findMemberPost(db, {
        leagueId: m.leagueId,
        day: slot.day,
        userId: m.userId,
      })
      return {
        day: slot.day,
        firesAt: slot.firesAt.toISOString(),
        windowEndsAt: slot.windowEndsAt.toISOString(),
        post: post === null ? null : toPostView(post),
      }
    },

    async createUploads(m) {
      const now = clock()
      const slot = targetMoment(m.leagueId, now)
      const backId = randomUUID()
      const selfieId = randomUUID()
      const back = await presign(m, backId)
      const selfie = await presign(m, selfieId)
      await runInTransaction(db, async (tx) => {
        if ((await lockMemberRole(tx, m.leagueId, m.userId)) === null) throw notFound()
        const member = { leagueId: m.leagueId, userId: m.userId }
        if (await findMemberPost(tx, { ...member, day: slot.day })) throw alreadyPosted()
        const reserved = await countMomentReservationsSince(tx, {
          ...member,
          since: new Date(now.getTime() - HOUR_MS),
        })
        if (reserved >= MAX_RESERVATIONS_PER_HOUR) {
          throw new AppError('MOMENT_TOO_MANY_ATTEMPTS', 429, 'Too many Moment attempts')
        }
        await insertMomentUploads(tx, {
          ...member,
          back: { id: backId, objectKey: back.objectKey },
          selfie: { id: selfieId, objectKey: selfie.objectKey },
        })
      })
      const expiresAt = new Date(now.getTime() + UPLOAD_PRESIGN_TTL_SECONDS * 1000).toISOString()
      return {
        back: { uploadId: backId, ...back.presigned, expiresAt },
        selfie: { uploadId: selfieId, ...selfie.presigned, expiresAt },
      }
    },

    async post(m, body) {
      const now = clock()
      const member = { leagueId: m.leagueId, userId: m.userId }
      const result = await runInTransaction(db, async (tx) => {
        if ((await lockMemberRole(tx, m.leagueId, m.userId)) === null) throw notFound()
        const back = assertPendingUpload(
          await lockMemberUpload(tx, { ...member, uploadId: body.backUploadId }),
          { kind: 'card', now },
        )
        const selfie = assertPendingUpload(
          await lockMemberUpload(tx, { ...member, uploadId: body.selfieUploadId }),
          { kind: 'selfie', now },
        )
        await assertObjectsUploaded([back, selfie])
        const takenAt = back.createdAt
        const slot = targetMoment(m.leagueId, takenAt)
        const lateMinutes = momentLateMinutes(slot, takenAt)
        const rewardDust = momentRewardDust(lateMinutes)
        const isInserted = await insertMomentPost(tx, {
          ...member,
          day: slot.day,
          backUploadId: back.id,
          selfieUploadId: selfie.id,
          takenAt,
          lateMinutes,
          rewardDust,
        })
        if (!isInserted) throw alreadyPosted()
        const capturedAt = body.capturedAt === null ? null : new Date(body.capturedAt)
        await completeMomentUploads(tx, {
          backUploadId: back.id,
          selfieUploadId: selfie.id,
          title: momentCardTitle(slot),
          capturedAt: sanitizeCaptureDate(capturedAt, now),
          now,
        })
        await creditMomentReward(tx, { ...member, dust: rewardDust, lateMinutes, now })
        return { day: slot.day, takenAt, lateMinutes, rewardDust, uploadIds: [back.id, selfie.id] }
      })
      for (const uploadId of result.uploadIds) await jobs.enqueueMediaProcess({ uploadId })
      await emblems.request([member])
      return {
        day: result.day,
        takenAt: result.takenAt.toISOString(),
        lateMinutes: result.lateMinutes,
        rewardDust: result.rewardDust,
      }
    },
  }
}
