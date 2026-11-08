import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { UPLOAD_CONTENT_TYPE, type Portrait, type UploadState } from '@storix/shared'
import { errorMessage } from '@/features/errors/error-messages'
import { userMessage } from '@/features/errors/user-message'
import { INVALID_IMAGE_MESSAGE } from '@/features/uploads/upload-pipeline'
import { UPLOAD_FAILED_MESSAGE, postToBucket } from '@/features/uploads/uploads.api'
import { ApiError } from '@/lib/http'
import { logger } from '@/lib/logger'
import { onPortraitChanged, refreshPortraitViews } from './portrait-cache'
import type { PortraitTarget } from './portrait-target'
import {
  completePortraitUpload,
  createPortraitUpload,
  fetchPortraitUploadState,
} from './portraits.api'

const POLL_INTERVAL_MS = 1000
const POLL_TIMEOUT_MS = 60_000

const NOT_ALLOWED_MESSAGE = "Tu n'as plus les droits pour changer cette photo."
const TIMEOUT_MESSAGE = 'Toujours en cours de traitement, réessaie dans un instant.'

export type PortraitUploadPhase = 'idle' | 'sending' | 'processing' | 'done' | 'error'

class PortraitUploadError extends Error {}

type SendOutcome = 'ready' | 'superseded'

function isGone(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}

function isPending(state: UploadState): boolean {
  return ['pending', 'uploaded', 'processing'].includes(state.status)
}

function isTransient(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof ApiError && error.status >= 500)
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', cancel)
      resolve()
    }, ms)
    const cancel = (): void => {
      window.clearTimeout(timer)
      reject(new DOMException('Upload aborted', 'AbortError'))
    }
    signal.addEventListener('abort', cancel, { once: true })
  })
}

async function waitUntilSettled(
  target: PortraitTarget,
  first: UploadState,
  signal: AbortSignal,
): Promise<UploadState | null> {
  const deadline = Date.now() + POLL_TIMEOUT_MS
  let state = first
  while (isPending(state)) {
    if (Date.now() > deadline) throw new PortraitUploadError(TIMEOUT_MESSAGE)
    await delay(POLL_INTERVAL_MS, signal)
    try {
      state = await fetchPortraitUploadState(target, state.uploadId, signal)
    } catch (error) {
      if (!signal.aborted && isGone(error)) return null
      if (signal.aborted || !isTransient(error)) throw error
      logger.debug('Transient portrait state failure', { uploadId: state.uploadId })
    }
  }
  return state
}

function settledMessage(state: UploadState): string | null {
  if (state.status === 'ready') return null
  if (state.status === 'rejected') {
    return state.rejectionReason === 'NOT_ALLOWED' ? NOT_ALLOWED_MESSAGE : INVALID_IMAGE_MESSAGE
  }
  return errorMessage('INTERNAL_ERROR')
}

function failureMessage(error: unknown): string {
  if (error instanceof PortraitUploadError) return error.message
  if (error instanceof TypeError) return UPLOAD_FAILED_MESSAGE
  return userMessage(error)
}

async function sendPortrait(
  queryClient: QueryClient,
  target: PortraitTarget,
  previous: Portrait | null,
  blob: Blob,
  signal: AbortSignal,
  onProcessing: () => void,
): Promise<SendOutcome> {
  const reservation = await createPortraitUpload(
    target,
    { contentType: UPLOAD_CONTENT_TYPE, size: blob.size },
    signal,
  )
  await postToBucket({ url: reservation.url, fields: reservation.fields }, blob, signal)
  const completed = await completePortraitUpload(target, reservation.uploadId, signal)
  onProcessing()
  const settled = await waitUntilSettled(target, completed, signal)
  if (settled === null) {
    await onPortraitChanged(queryClient, target, previous)
    return 'superseded'
  }
  const message = settledMessage(settled)
  if (message !== null) throw new PortraitUploadError(message)
  await onPortraitChanged(queryClient, target, previous)
  return 'ready'
}

/**
 * Sends a cropped portrait through presign, bucket POST and completion, then waits for its processing.
 * An upload replaced from another device (404 while polling) ends quietly with a refetch of the portrait.
 */
export function usePortraitUpload(
  target: PortraitTarget,
  current: Portrait | null,
): {
  upload: (blob: Blob) => void
  phase: PortraitUploadPhase
  errorMessage: string | null
  reset: () => void
} {
  const queryClient = useQueryClient()
  const [phase, setPhase] = useState<PortraitUploadPhase>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const targetRef = useRef(target)
  const currentRef = useRef(current)

  useEffect(() => {
    targetRef.current = target
    currentRef.current = current
  })

  useEffect(() => () => controllerRef.current?.abort(), [])

  const upload = useCallback(
    (blob: Blob): void => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      const uploadTarget = targetRef.current
      let isProcessing = false
      setPhase('sending')
      setMessage(null)
      sendPortrait(queryClient, uploadTarget, currentRef.current, blob, controller.signal, () => {
        isProcessing = true
        setPhase('processing')
      }).then(
        (outcome) => {
          if (controller.signal.aborted) return
          if (outcome === 'superseded') logger.info('Portrait upload replaced elsewhere')
          setPhase(outcome === 'ready' ? 'done' : 'idle')
        },
        (error: unknown) => {
          const isStopped = controller.signal.aborted || isAbort(error)
          if (isProcessing && (isStopped || error instanceof PortraitUploadError)) {
            void refreshPortraitViews(queryClient, uploadTarget)
          }
          if (isStopped) return
          logger.warn('Portrait upload failed', { error })
          setPhase('error')
          setMessage(failureMessage(error))
        },
      )
    },
    [queryClient],
  )

  const reset = useCallback((): void => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setPhase('idle')
    setMessage(null)
  }, [])

  return { upload, phase, errorMessage: message, reset }
}
