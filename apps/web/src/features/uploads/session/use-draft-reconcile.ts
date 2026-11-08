import { useCallback, useEffect, useRef, type Dispatch, type RefObject } from 'react'
import type { UploadState } from '@storix/shared'
import { errorMessage } from '@/features/errors/error-messages'
import { logger } from '@/lib/logger'
import { INVALID_IMAGE_MESSAGE } from '../upload-pipeline'
import { fetchUploadStates } from '../uploads.api'
import type { SessionAction, SessionState, StackCard } from './session-reducer'

const POLL_INTERVAL_MS = 1500
const PUBLISHED_STATUSES: ReadonlySet<UploadState['status']> = new Set(['publishing', 'ready'])

export interface DraftReconcileInput {
  leagueId: string
  state: SessionState
  stateRef: RefObject<SessionState>
  dispatch: Dispatch<SessionAction>
  onStaged: () => Promise<void>
  onGone: (uploadIds: readonly string[]) => void
}

function isResumedProcessing(card: StackCard): boolean {
  return card.phase === 'processing' && card.photo === null && card.uploadId !== null
}

function isReconcilable(screen: SessionState['screen']): boolean {
  return screen !== 'publishing' && screen !== 'done'
}

/** Polls resumed drafts still processing, and drops cards published or discarded elsewhere (R23). */
export function useDraftReconcile({
  leagueId,
  state,
  stateRef,
  dispatch,
  onStaged,
  onGone,
}: DraftReconcileInput): { reconcile: () => Promise<void> } {
  const onStagedRef = useRef(onStaged)
  const onGoneRef = useRef(onGone)

  useEffect(() => {
    onStagedRef.current = onStaged
    onGoneRef.current = onGone
  }, [onStaged, onGone])

  const apply = useCallback(
    (cards: readonly StackCard[], states: readonly UploadState[]): void => {
      const byId = new Map(states.map((upload) => [upload.uploadId, upload]))
      const gone = cards.flatMap((card) => {
        const upload = card.uploadId ? byId.get(card.uploadId) : undefined
        const isGone =
          !upload || upload.status === 'discarded' || PUBLISHED_STATUSES.has(upload.status)
        return isGone && card.uploadId ? [card.uploadId] : []
      })
      const publishedElsewhere = states.filter((upload) => PUBLISHED_STATUSES.has(upload.status))
      if (gone.length > 0) {
        dispatch({
          type: 'reconciled',
          goneUploadIds: gone,
          publishedElsewhere: publishedElsewhere.length,
        })
        onGoneRef.current(gone)
      }
      let hasStaged = false
      for (const card of cards.filter(isResumedProcessing)) {
        const upload = card.uploadId ? byId.get(card.uploadId) : undefined
        if (upload?.status === 'staged') {
          hasStaged = true
          dispatch({ type: 'phase', localId: card.localId, phase: 'staged' })
        } else if (upload?.status === 'rejected') {
          const isDuplicate = upload.rejectionReason === 'DUPLICATE_PHOTO'
          dispatch({
            type: 'phase',
            localId: card.localId,
            phase: isDuplicate ? 'duplicate' : 'error',
            patch: isDuplicate ? {} : { errorMessage: INVALID_IMAGE_MESSAGE, isRetryable: false },
          })
        } else if (upload?.status === 'failed') {
          dispatch({
            type: 'phase',
            localId: card.localId,
            phase: 'error',
            patch: { errorMessage: errorMessage('INTERNAL_ERROR'), isRetryable: false },
          })
        }
      }
      if (hasStaged) {
        onStagedRef.current().catch((error: unknown) => {
          logger.warn('Draft images refresh failed', { error })
        })
      }
    },
    [dispatch],
  )

  const fetchAndApply = useCallback(
    async (cards: readonly StackCard[]): Promise<void> => {
      const ids = cards.flatMap((card) => (card.uploadId ? [card.uploadId] : []))
      if (ids.length === 0) return
      try {
        apply(cards, await fetchUploadStates(leagueId, ids))
      } catch (error) {
        logger.warn('Draft reconcile failed', { error })
      }
    },
    [apply, leagueId],
  )

  const reconcile = useCallback(async (): Promise<void> => {
    const current = stateRef.current
    if (!isReconcilable(current.screen)) return
    await fetchAndApply(current.cards.filter((card) => card.phase !== 'sending'))
  }, [fetchAndApply, stateRef])

  useEffect(() => {
    const handleVisibility = (): void => {
      if (document.visibilityState === 'visible') void reconcile()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [reconcile])

  const hasResumedProcessing = state.cards.some(isResumedProcessing)

  useEffect(() => {
    if (!hasResumedProcessing) return
    const timer = window.setInterval(() => {
      const current = stateRef.current
      if (isReconcilable(current.screen)) {
        void fetchAndApply(current.cards.filter(isResumedProcessing))
      }
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [hasResumedProcessing, fetchAndApply, stateRef])

  return { reconcile }
}
