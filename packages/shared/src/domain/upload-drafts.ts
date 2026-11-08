import { CARD_TITLE_MAX_LENGTH } from './cards'
import { isCropRectValid, type CropFrame, type CropRect, type ImageSize } from './crop-frame'

/** Every upload status; `schemas/uploads.ts` asserts that `UPLOAD_STATUSES` matches it. */
export type DraftUploadStatus =
  | 'pending'
  | 'uploaded'
  | 'processing'
  | 'ready'
  | 'rejected'
  | 'failed'
  | 'staged'
  | 'publishing'
  | 'discarded'

export const DRAFT_TTL_MS = 48 * 3_600_000
export const DISCARDED_SWEEP_DELAY_MS = 30 * 60_000
export const PUBLISH_STUCK_MS = 10 * 60_000
export const MAX_PUBLISH_BATCH = 30

export const QUOTA_COMPLETED_STATUSES = [
  'uploaded',
  'processing',
  'staged',
  'publishing',
  'ready',
] as const satisfies readonly DraftUploadStatus[]

export const EDITABLE_DRAFT_STATUSES = [
  'uploaded',
  'processing',
  'staged',
] as const satisfies readonly DraftUploadStatus[]

const ALREADY_PUBLISHED_STATUSES: readonly DraftUploadStatus[] = ['publishing', 'ready']
const UNPUBLISHABLE_STATUSES: readonly DraftUploadStatus[] = ['rejected', 'failed', 'discarded']

interface DraftState {
  status: DraftUploadStatus
  stageOnly: boolean
}

function isEditableStatus(status: DraftUploadStatus): boolean {
  return (EDITABLE_DRAFT_STATUSES as readonly DraftUploadStatus[]).includes(status)
}

/** Tells whether the title, tags and crop of an upload may still be edited. */
export function canEditDraft(input: DraftState): boolean {
  return input.stageOnly && isEditableStatus(input.status)
}

/** Tells whether an upload may be discarded: a pending one always, a draft until it is published. */
export function canDiscardUpload(input: DraftState): boolean {
  if (input.status === 'pending') return true
  return input.stageOnly && isEditableStatus(input.status)
}

export type PublishProblemReason =
  'NOT_FOUND' | 'NOT_STAGED' | 'NOT_PUBLISHABLE' | 'TITLE_REQUIRED' | 'CROP_INVALID'

export interface PublishCandidate {
  uploadId: string
  status: DraftUploadStatus
  stageOnly: boolean
  title: string | null
  crop: CropRect | null
  mediaSize: ImageSize | null
}

export interface PublishPlan {
  publish: string[]
  alreadyPublished: string[]
  problems: Array<{ uploadId: string; reason: PublishProblemReason }>
}

type CandidateVerdict = 'publish' | 'already-published' | PublishProblemReason

function isTitleValid(title: string | null): boolean {
  const length = title?.trim().length ?? 0
  return length >= 1 && length <= CARD_TITLE_MAX_LENGTH
}

function judgeCandidate(
  candidate: PublishCandidate | undefined,
  frame: CropFrame,
): CandidateVerdict {
  if (candidate === undefined) return 'NOT_FOUND'
  const { status } = candidate
  if (!candidate.stageOnly || UNPUBLISHABLE_STATUSES.includes(status)) return 'NOT_PUBLISHABLE'
  if (ALREADY_PUBLISHED_STATUSES.includes(status)) return 'already-published'
  if (status !== 'staged') return 'NOT_STAGED'
  if (!isTitleValid(candidate.title)) return 'TITLE_REQUIRED'
  if (
    candidate.crop !== null &&
    (candidate.mediaSize === null || !isCropRectValid(candidate.crop, candidate.mediaSize, frame))
  ) {
    return 'CROP_INVALID'
  }
  return 'publish'
}

/** Sorts the requested uploads, in request order, into those to publish, already published, and problems. */
export function planPublish(input: {
  requestedIds: readonly string[]
  candidates: readonly PublishCandidate[]
  frame: CropFrame
}): PublishPlan {
  const byId = new Map(input.candidates.map((candidate) => [candidate.uploadId, candidate]))
  return input.requestedIds.reduce<PublishPlan>(
    (plan, uploadId) => {
      const verdict = judgeCandidate(byId.get(uploadId), input.frame)
      if (verdict === 'publish') return { ...plan, publish: [...plan.publish, uploadId] }
      if (verdict === 'already-published') {
        return { ...plan, alreadyPublished: [...plan.alreadyPublished, uploadId] }
      }
      return { ...plan, problems: [...plan.problems, { uploadId, reason: verdict }] }
    },
    { publish: [], alreadyPublished: [], problems: [] },
  )
}

export type DraftSweepVerdict = 'keep' | 'delete' | 'recover-publish'

function isOlderThan(instant: Date | null, now: Date, ms: number): boolean {
  return instant === null || now.getTime() - instant.getTime() > ms
}

/** Decides what the sweep does with a discarded, staged or publishing upload; other statuses are kept. */
export function classifyDraftForSweep(input: {
  status: DraftUploadStatus
  stageOnly: boolean
  createdAt: Date
  processedAt: Date | null
  publishRequestedAt: Date | null
  hasOwner: boolean
  isOwnerMember: boolean
  now: Date
}): DraftSweepVerdict {
  const { status, now } = input
  if (status === 'discarded') {
    return isOlderThan(input.processedAt, now, DISCARDED_SWEEP_DELAY_MS) ? 'delete' : 'keep'
  }
  if (status === 'staged' && input.stageOnly) {
    const expired = isOlderThan(input.createdAt, now, DRAFT_TTL_MS)
    return !input.hasOwner || !input.isOwnerMember || expired ? 'delete' : 'keep'
  }
  if (status === 'publishing') {
    return isOlderThan(input.publishRequestedAt, now, PUBLISH_STUCK_MS) ? 'recover-publish' : 'keep'
  }
  return 'keep'
}
