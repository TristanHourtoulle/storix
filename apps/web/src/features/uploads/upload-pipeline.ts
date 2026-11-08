import { UPLOAD_CONTENT_TYPE, type UploadState } from '@storix/shared'
import { errorMessage } from '@/features/errors/error-messages'
import { UserFacingError, userMessage } from '@/features/errors/user-message'
import { playSound } from '@/features/sound/sound'
import { ApiError } from '@/lib/http'
import { logger } from '@/lib/logger'
import {
  UPLOAD_FAILED_MESSAGE,
  completeUpload,
  createUpload,
  fetchUploadState,
  postToBucket,
  type BucketTarget,
} from './uploads.api'

const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 120_000
const PRESIGN_SAFETY_MS = 60_000
const MAX_TRANSIENT_RETRIES = 2
const RETRY_BASE_MS = 1000

const INVALID_IMAGE_MESSAGE = "Cette photo n'a pas pu être lue."
const SLOW_MESSAGE = 'Toujours en cours de traitement.'

export type StagePhase = 'sending' | 'processing'

export interface StageContext {
  leagueId: string
  signal: AbortSignal
  onPhase(
    localId: string,
    phase: StagePhase,
    extra?: { progress?: number; uploadId?: string },
  ): void
}

export interface StageCardInput {
  localId: string
  blob: Blob
  capturedAt: string | null
  uploadId?: string | null
}

export type StageOutcome =
  | { kind: 'staged'; uploadId: string }
  | { kind: 'duplicate'; uploadId: string }
  | { kind: 'error'; uploadId: string | null; message: string; isRetryable: boolean }
  | { kind: 'offline' }
  | { kind: 'cancelled' }

interface Reservation {
  uploadId: string
  target: BucketTarget
  expiresAt: number
  isCompleted: boolean
}

class CancelledError extends Error {
  constructor() {
    super('Stage upload cancelled')
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

function isQuotaExceeded(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'UPLOAD_QUOTA_EXCEEDED'
}

function isAbort(error: unknown): boolean {
  return (
    error instanceof CancelledError ||
    (error instanceof DOMException && error.name === 'AbortError')
  )
}

function isSettled(state: UploadState): boolean {
  return !['pending', 'uploaded', 'processing'].includes(state.status)
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

async function reserve(ctx: StageContext, card: StageCardInput): Promise<Reservation> {
  const response = await createUpload(
    ctx.leagueId,
    { contentType: UPLOAD_CONTENT_TYPE, size: card.blob.size },
    ctx.signal,
  )
  ctx.onPhase(card.localId, 'sending', { progress: 0, uploadId: response.uploadId })
  return {
    uploadId: response.uploadId,
    target: { url: response.url, fields: response.fields },
    expiresAt: Date.parse(response.expiresAt),
    isCompleted: false,
  }
}

async function waitForStaged(
  ctx: StageContext,
  uploadId: string,
  first: UploadState,
): Promise<UploadState | null> {
  const deadline = Date.now() + POLL_TIMEOUT_MS
  let state = first
  while (!isSettled(state)) {
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

function outcomeOf(uploadId: string, state: UploadState | null): StageOutcome {
  if (state === null) {
    return { kind: 'error', uploadId, message: SLOW_MESSAGE, isRetryable: true }
  }
  if (state.status === 'discarded') return { kind: 'cancelled' }
  if (state.status === 'rejected' && state.rejectionReason === 'DUPLICATE_PHOTO') {
    return { kind: 'duplicate', uploadId }
  }
  if (state.status === 'rejected') {
    return { kind: 'error', uploadId, message: INVALID_IMAGE_MESSAGE, isRetryable: false }
  }
  if (state.status === 'failed') {
    return {
      kind: 'error',
      uploadId,
      message: errorMessage('INTERNAL_ERROR'),
      isRetryable: true,
    }
  }
  return { kind: 'staged', uploadId }
}

async function resumeExisting(ctx: StageContext, uploadId: string): Promise<UploadState | null> {
  const state = await fetchUploadState(ctx.leagueId, uploadId, ctx.signal)
  if (state.status === 'pending' || state.status === 'failed') return null
  if (state.status === 'rejected' && state.rejectionReason !== 'DUPLICATE_PHOTO') return null
  return state
}

async function attempt(
  ctx: StageContext,
  card: StageCardInput,
  saved: Reservation | null,
  remember: (reservation: Reservation) => void,
): Promise<StageOutcome> {
  if (saved?.isCompleted) {
    ctx.onPhase(card.localId, 'processing', { uploadId: saved.uploadId })
    const state = await fetchUploadState(ctx.leagueId, saved.uploadId, ctx.signal)
    return outcomeOf(saved.uploadId, await waitForStaged(ctx, saved.uploadId, state))
  }
  ctx.onPhase(card.localId, 'sending', { progress: 0 })
  const isReusable = saved !== null && saved.expiresAt - PRESIGN_SAFETY_MS > Date.now()
  const reservation = isReusable ? saved : await reserve(ctx, card)
  remember(reservation)
  ensureActive(ctx.signal)
  await postToBucket(reservation.target, card.blob, ctx.signal, (progress) =>
    ctx.onPhase(card.localId, 'sending', { progress }),
  )
  ensureActive(ctx.signal)
  const state = await completeUpload(
    ctx.leagueId,
    reservation.uploadId,
    { capturedAt: card.capturedAt },
    ctx.signal,
  )
  remember({ ...reservation, isCompleted: true })
  ctx.onPhase(card.localId, 'processing', { uploadId: reservation.uploadId })
  return outcomeOf(reservation.uploadId, await waitForStaged(ctx, reservation.uploadId, state))
}

function failure(error: unknown, uploadId: string | null): StageOutcome {
  if (isQuotaExceeded(error)) {
    playSound({ name: 'quota' })
    return { kind: 'error', uploadId: null, message: userMessage(error), isRetryable: false }
  }
  const message = error instanceof TypeError ? UPLOAD_FAILED_MESSAGE : userMessage(error)
  const isRetryable =
    isStaleReservation(error) ||
    isTransient(error) ||
    (error instanceof UserFacingError && error.message === UPLOAD_FAILED_MESSAGE)
  return { kind: 'error', uploadId, message, isRetryable }
}

/** Reserves, sends, completes without a title and waits until one photo is a staged draft. */
export async function runStageUpload(
  ctx: StageContext,
  card: StageCardInput,
): Promise<StageOutcome> {
  const memory: { reservation: Reservation | null } = { reservation: null }
  const remember = (reservation: Reservation): void => {
    memory.reservation = reservation
  }
  for (let retry = 0; ; retry += 1) {
    try {
      ensureActive(ctx.signal)
      if (card.uploadId && memory.reservation === null) {
        const existing = await resumeExisting(ctx, card.uploadId)
        if (existing) {
          ctx.onPhase(card.localId, 'processing', { uploadId: card.uploadId })
          return outcomeOf(card.uploadId, await waitForStaged(ctx, card.uploadId, existing))
        }
      }
      return await attempt(ctx, card, memory.reservation, remember)
    } catch (error) {
      if (isAbort(error) || ctx.signal.aborted) return { kind: 'cancelled' }
      if (isOffline()) return { kind: 'offline' }
      if (isTransient(error) && retry < MAX_TRANSIENT_RETRIES) {
        await delay(RETRY_BASE_MS * 2 ** retry, ctx.signal)
        continue
      }
      logger.warn('Stage upload failed', { localId: card.localId, error })
      return failure(error, memory.reservation?.uploadId ?? card.uploadId ?? null)
    }
  }
}
