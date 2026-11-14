import type { Database } from '@storix/db'
import {
  canEditDraft,
  CARD_CROP_FRAME,
  DISCARDED_SWEEP_DELAY_MS,
  DRAFT_TTL_MS,
  planPublish,
  captureInstant,
  storedMediaKeys,
  storedSeriesIdsSchema,
  type EditedUpload,
  type EditUploadBody,
  type MediaVariantSize,
  type PublishPlan,
  type UploadDraft,
  type UploadState,
} from '@storix/shared'
import type { JobQueue } from '../../jobs/job-queue'
import type { ErrorLogger } from '../../lib/error-logger'
import { AppError, notFound } from '../../lib/errors'
import type { MediaSigner } from '../../lib/media-signer'
import { runInTransaction } from '../../lib/transaction'
import { toImageSet } from '../cards/image-set'
import type { Membership } from '../leagues/leagues.service'
import { assertTaggedMembers } from './assert-tagged-members'
import {
  deleteCardlessMediaOfUploads,
  filterSeriesForPhoto,
  findMediaCapturedAt,
  findOwnedUploadRow,
  listDrafts,
  listOwnedStates,
  lockPublishCandidates,
  markDiscarded,
  markPublishing,
  touchPublishRequested,
  updateDraftFields,
  type DraftRow,
  type LockedPublishCandidate,
} from './upload-drafts.repository'
import { toUploadState } from './upload-state'
import { lockMemberRole, type UploadRow } from './uploads.repository'

const DRAFT_IMAGE_SIZES: readonly MediaVariantSize[] = [768, 1600]
const PUBLISH_REKICK_MIN_AGE_MS = 60_000

export interface UploadDraftsService {
  editUpload(m: Membership, uploadId: string, body: EditUploadBody): Promise<EditedUpload>
  listDrafts(m: Membership): Promise<UploadDraft[]>
  listStates(m: Membership, ids: string[]): Promise<UploadState[]>
  discard(m: Membership, ids: string[]): Promise<void>
  publish(m: Membership, ids: string[]): Promise<UploadState[]>
}

function notEditable(row: UploadRow): AppError {
  return new AppError('UPLOAD_NOT_EDITABLE', 409, 'The upload can no longer be edited', {
    status: row.status,
  })
}

function draftTitleOf(title: string | undefined): string | null | undefined {
  if (title === undefined) return undefined
  return title === '' ? null : title
}

function inRequestOrder(rows: readonly UploadRow[], ids: readonly string[]): UploadRow[] {
  const byId = new Map(rows.map((row) => [row.id, row]))
  return ids.flatMap((id) => {
    const row = byId.get(id)
    return row === undefined ? [] : [row]
  })
}

function isDueForRekick(candidate: LockedPublishCandidate, now: Date): boolean {
  const requestedAt = candidate.publishRequestedAt
  return requestedAt === null || now.getTime() - requestedAt.getTime() >= PUBLISH_REKICK_MIN_AGE_MS
}

function publishJobIds(
  requestedIds: readonly string[],
  plan: PublishPlan,
  candidates: readonly LockedPublishCandidate[],
  now: Date,
): string[] {
  const inFlight = new Set(
    candidates
      .filter((c) => c.status === 'publishing' && isDueForRekick(c, now))
      .map((c) => c.uploadId),
  )
  const queued = new Set([
    ...plan.publish,
    ...plan.alreadyPublished.filter((id) => inFlight.has(id)),
  ])
  return requestedIds.filter((id) => queued.has(id))
}

function toDraft(row: DraftRow, signer: MediaSigner): UploadDraft {
  const staged = row.status === 'staged' ? row.media : null
  return {
    uploadId: row.id,
    status: row.status === 'staged' || row.status === 'processing' ? row.status : 'uploaded',
    title: row.title,
    taggedUserIds: row.taggedUserIds,
    seriesIds: storedSeriesIdsSchema.parse(row.seriesIds),
    crop: row.crop,
    capturedAt: (row.media?.capturedAt ?? row.clientCapturedAt)?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    expiresAt: new Date(row.createdAt.getTime() + DRAFT_TTL_MS).toISOString(),
    media:
      staged === null
        ? null
        : {
            image: toImageSet(staged.variants, DRAFT_IMAGE_SIZES, signer),
            thumbhash: staged.thumbhash,
            width: staged.width,
            height: staged.height,
          },
  }
}

/** Builds the upload drafts service: editing, listing, polling, discarding and publishing the member's own drafts. */
export function createUploadDraftsService(deps: {
  db: Database
  jobs: JobQueue
  signer: MediaSigner
  clock: () => Date
  logger: ErrorLogger
}): UploadDraftsService {
  const { db, jobs, signer, clock, logger } = deps

  async function statesOf(m: Membership, ids: readonly string[]): Promise<UploadState[]> {
    const rows = await listOwnedStates(db, { leagueId: m.leagueId, userId: m.userId, ids })
    return inRequestOrder(rows, ids).map(toUploadState)
  }

  async function lockAndPlanPublish(m: Membership, ids: string[]): Promise<string[]> {
    return runInTransaction(db, async (tx) => {
      if ((await lockMemberRole(tx, m.leagueId, m.userId)) === null) throw notFound()
      const scope = { leagueId: m.leagueId, userId: m.userId, ids }
      const candidates = await lockPublishCandidates(tx, scope)
      const plan = planPublish({ requestedIds: ids, candidates, frame: CARD_CROP_FRAME })
      if (plan.problems.length > 0) {
        throw new AppError('PUBLISH_REJECTED', 409, 'Some uploads cannot be published', {
          problems: plan.problems,
        })
      }
      const now = clock()
      if (plan.publish.length > 0) {
        const marked = await markPublishing(tx, { ...scope, ids: plan.publish, now })
        if (marked !== plan.publish.length) throw new Error('Publish candidates changed under lock')
      }
      const jobIds = publishJobIds(ids, plan, candidates, now)
      const fresh = new Set(plan.publish)
      await touchPublishRequested(tx, {
        ...scope,
        ids: jobIds.filter((id) => !fresh.has(id)),
        now,
      })
      return jobIds
    })
  }

  async function enqueuePublishJobs(m: Membership, uploadIds: readonly string[]): Promise<void> {
    for (const [index, uploadId] of uploadIds.entries()) {
      try {
        await jobs.enqueueMediaPublish({ uploadId })
      } catch (error) {
        logger.error(
          { err: error, leagueId: m.leagueId, pendingUploadIds: uploadIds.slice(index) },
          'Media publish enqueue failed; the sweep will recover it',
        )
        return
      }
    }
  }

  async function enqueueDiscardedFilesDeletion(m: Membership, keys: readonly string[]) {
    if (keys.length === 0) return
    try {
      await jobs.enqueueStorageDelete(keys, { delaySeconds: DISCARDED_SWEEP_DELAY_MS / 1000 })
    } catch (error) {
      logger.error(
        { err: error, leagueId: m.leagueId, keys: keys.length },
        'Failed to enqueue discarded draft files deletion; the sweep and the GC will recover them',
      )
    }
  }

  async function findOwned(m: Membership, uploadId: string): Promise<UploadRow> {
    const row = await findOwnedUploadRow(db, { leagueId: m.leagueId, userId: m.userId, uploadId })
    if (row === null) throw notFound('Upload not found')
    return row
  }

  return {
    async editUpload(m, uploadId, body) {
      const row = await findOwned(m, uploadId)
      if (!canEditDraft(row)) throw notEditable(row)
      if (body.taggedUserIds !== undefined) {
        await assertTaggedMembers(db, m.leagueId, body.taggedUserIds)
      }
      const seriesIds =
        body.seriesIds === undefined
          ? undefined
          : await filterSeriesForPhoto(db, {
              leagueId: m.leagueId,
              seriesIds: body.seriesIds,
              photo: {
                capturedAt: captureInstant({
                  mediaCapturedAt: await findMediaCapturedAt(db, row.id),
                  clientCapturedAt: row.clientCapturedAt,
                  uploadedAt: row.createdAt,
                }),
                sentAt: clock(),
              },
            })
      const updated = await updateDraftFields(db, {
        leagueId: m.leagueId,
        userId: m.userId,
        id: row.id,
        title: draftTitleOf(body.title),
        taggedUserIds: body.taggedUserIds,
        seriesIds,
        crop: body.crop,
      })
      const current = await findOwned(m, uploadId)
      if (!updated) throw notEditable(current)
      return {
        ...toUploadState(current),
        seriesIds: storedSeriesIdsSchema.parse(current.seriesIds),
      }
    },

    async listDrafts(m) {
      const now = clock().getTime()
      const rows = await listDrafts(db, { leagueId: m.leagueId, userId: m.userId })
      return rows
        .filter((row) => row.createdAt.getTime() + DRAFT_TTL_MS > now)
        .map((row) => toDraft(row, signer))
    },

    listStates: statesOf,

    async discard(m, ids) {
      const keys = await runInTransaction(db, async (tx) => {
        if ((await lockMemberRole(tx, m.leagueId, m.userId)) === null) return []
        const scope = { leagueId: m.leagueId, userId: m.userId }
        const discarded = await markDiscarded(tx, { ...scope, ids, now: clock() })
        const removed = await deleteCardlessMediaOfUploads(
          tx,
          discarded.map((upload) => upload.id),
        )
        return [
          ...removed.flatMap((row) => storedMediaKeys(row)),
          ...discarded.map((upload) => upload.objectKey),
        ]
      })
      await enqueueDiscardedFilesDeletion(m, keys)
    },

    async publish(m, ids) {
      await enqueuePublishJobs(m, await lockAndPlanPublish(m, ids))
      return statesOf(m, ids)
    },
  }
}
