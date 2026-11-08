import { UPLOAD_CONTENT_TYPE, type UploadState } from '@storix/shared'
import { errorMessage } from '@/features/errors/error-messages'
import { userMessage } from '@/features/errors/user-message'
import { ApiError } from '@/lib/http'
import { logger } from '@/lib/logger'
import type { PreparedPhoto } from './prepare-photo'
import {
  UPLOAD_FAILED_MESSAGE,
  completeUpload,
  createUpload,
  fetchUploadState,
  postToBucket,
  type BucketTarget,
} from './uploads.api'
import type { DraftPhase, PhotoDraft, PhaseExtra } from './use-photo-drafts'

const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 120_000
const PRESIGN_SAFETY_MS = 60_000
const MAX_TRANSIENT_RETRIES = 2
const RETRY_BASE_MS = 1000

export const OFFLINE_MESSAGE = 'Hors ligne, nouvel essai dès le retour du réseau.'
const INVALID_IMAGE_MESSAGE = "Cette photo n'a pas pu être lue."
const SLOW_MESSAGE = 'Toujours en cours de traitement, relance la création pour vérifier.'

export interface UploadProgress {
  uploadId: string
  target: BucketTarget
  expiresAt: number
  isCompleted: boolean
}

export interface PipelineContext {
  leagueId: string
  signal: AbortSignal
  readProgress: (draftId: string) => UploadProgress | undefined
  saveProgress: (draftId: string, progress: UploadProgress) => void
  setPhase: (id: string, phase: DraftPhase, extra?: PhaseExtra) => void
}

type DraftOutcome = 'offline' | 'settled'

class CancelledError extends Error {
  constructor() {
    super('Upload pipeline cancelled')
    this.name = 'CancelledError'
  }
}

function ensureActive(signal: AbortSignal): void {
  if (signal.aborted) throw new CancelledError()
}

function isOffline(): boolean {
  return navigator.onLine === false
}

function isTransient(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof ApiError && error.status >= 500)
}

function isStaleReservation(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === 'UPLOAD_NOT_READY' || error.code === 'UPLOAD_EXPIRED')
  )
}

function isTerminal(state: UploadState): boolean {
  return state.status === 'ready' || state.status === 'rejected' || state.status === 'failed'
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const finish = (): void => {
      window.clearTimeout(timer)
      signal.removeEventListener('abort', finish)
      resolve()
    }
    const timer = window.setTimeout(finish, ms)
    signal.addEventListener('abort', finish, { once: true })
  })
}

/** Resolves once the browser is back online, or on abort. */
export function waitForNetwork(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const finish = (): void => {
      window.removeEventListener('online', finish)
      signal.removeEventListener('abort', finish)
      resolve()
    }
    if (!isOffline() || signal.aborted) {
      resolve()
      return
    }
    window.addEventListener('online', finish)
    signal.addEventListener('abort', finish, { once: true })
  })
}

async function reserve(ctx: PipelineContext, draftId: string, blob: Blob): Promise<UploadProgress> {
  const response = await createUpload(
    ctx.leagueId,
    { contentType: UPLOAD_CONTENT_TYPE, size: blob.size },
    ctx.signal,
  )
  const progress: UploadProgress = {
    uploadId: response.uploadId,
    target: { url: response.url, fields: response.fields },
    expiresAt: Date.parse(response.expiresAt),
    isCompleted: false,
  }
  ctx.saveProgress(draftId, progress)
  return progress
}

async function resumeState(
  ctx: PipelineContext,
  draftId: string,
  saved: UploadProgress,
): Promise<UploadState | null> {
  const state = await fetchUploadState(ctx.leagueId, saved.uploadId, ctx.signal)
  if (state.status === 'pending') return null
  ctx.saveProgress(draftId, { ...saved, isCompleted: true })
  return state
}

async function send(
  ctx: PipelineContext,
  draft: PhotoDraft,
  photo: PreparedPhoto,
): Promise<{ uploadId: string; state: UploadState }> {
  const saved = ctx.readProgress(draft.id)
  if (saved) {
    const resumed = await resumeState(ctx, draft.id, saved)
    if (resumed) return { uploadId: saved.uploadId, state: resumed }
  }
  ctx.setPhase(draft.id, 'sending')
  const isReusable = saved !== undefined && saved.expiresAt - PRESIGN_SAFETY_MS > Date.now()
  const progress = isReusable ? saved : await reserve(ctx, draft.id, photo.blob)
  ensureActive(ctx.signal)
  await postToBucket(progress.target, photo.blob, ctx.signal)
  ensureActive(ctx.signal)
  const state = await completeUpload(
    ctx.leagueId,
    progress.uploadId,
    {
      title: draft.title.trim(),
      taggedUserIds: [...draft.taggedUserIds],
      capturedAt: photo.capturedAt,
    },
    ctx.signal,
  )
  ctx.saveProgress(draft.id, { ...progress, isCompleted: true })
  return { uploadId: progress.uploadId, state }
}

async function waitForCard(
  ctx: PipelineContext,
  uploadId: string,
  first: UploadState,
): Promise<UploadState | null> {
  const deadline = Date.now() + POLL_TIMEOUT_MS
  let state = first
  while (!isTerminal(state)) {
    if (Date.now() > deadline) return null
    await delay(POLL_INTERVAL_MS, ctx.signal)
    ensureActive(ctx.signal)
    try {
      state = await fetchUploadState(ctx.leagueId, uploadId, ctx.signal)
    } catch (error) {
      if (ctx.signal.aborted || isOffline() || !isTransient(error)) throw error
      logger.debug('Transient upload state failure', { uploadId })
    }
  }
  return state
}

function applyFinalState(ctx: PipelineContext, draftId: string, state: UploadState | null): void {
  if (state === null) {
    ctx.setPhase(draftId, 'ready', { errorMessage: SLOW_MESSAGE })
  } else if (state.status === 'ready') {
    ctx.setPhase(draftId, 'created', { cardId: state.cardId })
  } else if (state.rejectionReason === 'DUPLICATE_PHOTO') {
    ctx.setPhase(draftId, 'duplicate')
  } else if (state.rejectionReason === 'INVALID_IMAGE') {
    ctx.setPhase(draftId, 'error', { errorMessage: INVALID_IMAGE_MESSAGE })
  } else {
    ctx.setPhase(draftId, 'error', { errorMessage: errorMessage('INTERNAL_ERROR') })
  }
}

async function attempt(
  ctx: PipelineContext,
  draft: PhotoDraft,
  photo: PreparedPhoto,
): Promise<void> {
  const { uploadId, state } = await send(ctx, draft, photo)
  ensureActive(ctx.signal)
  if (!isTerminal(state)) ctx.setPhase(draft.id, 'processing')
  const final = await waitForCard(ctx, uploadId, state)
  ensureActive(ctx.signal)
  applyFinalState(ctx, draft.id, final)
}

async function processDraft(ctx: PipelineContext, draft: PhotoDraft): Promise<DraftOutcome> {
  const photo = draft.photo
  if (!photo) return 'settled'
  for (let retry = 0; ; retry += 1) {
    try {
      await attempt(ctx, draft, photo)
      return 'settled'
    } catch (error) {
      if (error instanceof CancelledError || ctx.signal.aborted) return 'settled'
      if (isOffline()) {
        ctx.setPhase(draft.id, 'ready', { errorMessage: OFFLINE_MESSAGE })
        return 'offline'
      }
      if (isTransient(error) && retry < MAX_TRANSIENT_RETRIES) {
        await delay(RETRY_BASE_MS * 2 ** retry, ctx.signal)
        continue
      }
      logger.warn('Card creation failed', { draftId: draft.id, error })
      const message = error instanceof TypeError ? UPLOAD_FAILED_MESSAGE : userMessage(error)
      ctx.setPhase(draft.id, 'error', {
        errorMessage: message,
        isRetryable: isStaleReservation(error),
      })
      return 'settled'
    }
  }
}

/** Legacy titled-card pipeline used by the old add screen; processes drafts with bounded parallelism and returns the ones stopped by a lost connection. */
export async function processDrafts(
  ctx: PipelineContext,
  drafts: readonly PhotoDraft[],
  parallelism: number,
): Promise<readonly PhotoDraft[]> {
  let cursor = 0
  const worker = async (): Promise<readonly PhotoDraft[]> => {
    let offline: readonly PhotoDraft[] = []
    while (cursor < drafts.length && !ctx.signal.aborted) {
      const draft = drafts[cursor]
      cursor += 1
      if (draft && (await processDraft(ctx, draft)) === 'offline') offline = [...offline, draft]
    }
    return offline
  }
  const workers = Array.from({ length: Math.min(parallelism, drafts.length) }, worker)
  const results = await Promise.all(workers)
  return results.flat()
}
