import { UPLOAD_CONTENT_TYPE, type UploadState } from '@storix/shared'
import { errorMessage } from '@/features/errors/error-messages'
import { userMessage } from '@/features/errors/user-message'
import { logger } from '@/lib/logger'
import type { PreparedPhoto } from './prepare-photo'
import {
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
const OFFLINE_RETRY_MS = 10_000

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

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError || !navigator.onLine
}

function isTerminal(state: UploadState): boolean {
  return state.status === 'ready' || state.status === 'rejected' || state.status === 'failed'
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })
}

/** Resolves when the browser reports being back online, after a fallback delay, or on abort. */
export function waitForNetwork(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const done = (): void => {
      window.removeEventListener('online', done)
      resolve()
    }
    window.addEventListener('online', done)
    signal.addEventListener('abort', done, { once: true })
    if (navigator.onLine) void delay(OFFLINE_RETRY_MS, signal).then(done)
  })
}

async function reserve(ctx: PipelineContext, draftId: string, blob: Blob): Promise<UploadProgress> {
  const response = await createUpload(ctx.leagueId, {
    contentType: UPLOAD_CONTENT_TYPE,
    size: blob.size,
  })
  const progress: UploadProgress = {
    uploadId: response.uploadId,
    target: { url: response.url, fields: response.fields },
    expiresAt: Date.parse(response.expiresAt),
    isCompleted: false,
  }
  ctx.saveProgress(draftId, progress)
  return progress
}

async function send(
  ctx: PipelineContext,
  draft: PhotoDraft,
  photo: PreparedPhoto,
): Promise<{ uploadId: string; state: UploadState }> {
  const saved = ctx.readProgress(draft.id)
  if (saved?.isCompleted) {
    return { uploadId: saved.uploadId, state: await fetchUploadState(ctx.leagueId, saved.uploadId) }
  }
  ctx.setPhase(draft.id, 'sending')
  const isReusable = saved !== undefined && saved.expiresAt - PRESIGN_SAFETY_MS > Date.now()
  const progress = isReusable ? saved : await reserve(ctx, draft.id, photo.blob)
  ensureActive(ctx.signal)
  await postToBucket(progress.target, photo.blob)
  ensureActive(ctx.signal)
  const state = await completeUpload(ctx.leagueId, progress.uploadId, {
    title: draft.title.trim(),
    taggedUserIds: [...draft.taggedUserIds],
    capturedAt: photo.capturedAt,
  })
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
    state = await fetchUploadState(ctx.leagueId, uploadId)
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

async function processDraft(ctx: PipelineContext, draft: PhotoDraft): Promise<DraftOutcome> {
  const photo = draft.photo
  if (!photo) return 'settled'
  try {
    const { uploadId, state } = await send(ctx, draft, photo)
    ensureActive(ctx.signal)
    if (!isTerminal(state)) ctx.setPhase(draft.id, 'processing')
    const final = await waitForCard(ctx, uploadId, state)
    ensureActive(ctx.signal)
    applyFinalState(ctx, draft.id, final)
    return 'settled'
  } catch (error) {
    if (error instanceof CancelledError || ctx.signal.aborted) return 'settled'
    if (isNetworkError(error)) {
      ctx.setPhase(draft.id, 'ready', { errorMessage: OFFLINE_MESSAGE })
      return 'offline'
    }
    logger.warn('Card creation failed', { draftId: draft.id, error })
    ctx.setPhase(draft.id, 'error', { errorMessage: userMessage(error) })
    return 'settled'
  }
}

/** Processes drafts with bounded parallelism and returns the ones that hit a network failure. */
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
