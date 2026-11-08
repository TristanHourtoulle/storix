import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { runStageUpload, waitForNetwork, type StageOutcome } from '../upload-pipeline'
import { discardUploads } from '../uploads.api'
import { uploadQuotaQueryKey } from '../use-upload-quota'
import type { SessionAction, StackCard } from './session-reducer'

const PARALLEL_UPLOADS = 2

export interface StageQueueInput {
  leagueId: string
  cards: readonly StackCard[]
  dispatch: Dispatch<SessionAction>
}

export interface StageQueue {
  abortCard(localId: string): void
  /** Stops the queue, aborts uncompleted runs and returns every reservation not completed yet. */
  abortUnsent(): string[]
  abortAll(): void
}

function without<V>(map: ReadonlyMap<string, V>, key: string): ReadonlyMap<string, V> {
  return new Map([...map].filter(([id]) => id !== key))
}

/** Runs queued cards through the stage pipeline, two at a time, while the session is mounted. */
export function useStageQueue({ leagueId, cards, dispatch }: StageQueueInput): StageQueue {
  const queryClient = useQueryClient()
  const [version, setVersion] = useState(0)
  const sessionRef = useRef<AbortController | null>(null)
  const runningRef = useRef<ReadonlyMap<string, AbortController>>(new Map())
  const pendingRef = useRef<ReadonlyMap<string, string>>(new Map())
  const isStoppedRef = useRef(false)

  const discardPending = useCallback((): void => {
    const pending = [...pendingRef.current.values()]
    pendingRef.current = new Map()
    if (pending.length === 0) return
    discardUploads(leagueId, pending, { keepalive: true }).catch((error: unknown) => {
      logger.warn('Pending reservations discard failed on leave', { error })
    })
  }, [leagueId])

  useEffect(() => {
    const controller = new AbortController()
    sessionRef.current = controller
    isStoppedRef.current = false
    window.addEventListener('pagehide', discardPending)
    return () => {
      window.removeEventListener('pagehide', discardPending)
      controller.abort()
      runningRef.current.forEach((running) => running.abort())
      runningRef.current = new Map()
      discardPending()
    }
  }, [discardPending])

  const invalidateQuota = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: uploadQuotaQueryKey(leagueId) })
  }, [leagueId, queryClient])

  const settle = useCallback(
    (localId: string, outcome: StageOutcome): void => {
      if (outcome.kind === 'staged' || outcome.kind === 'duplicate') {
        dispatch({
          type: 'phase',
          localId,
          phase: outcome.kind,
          patch: { uploadId: outcome.uploadId },
        })
      } else if (outcome.kind === 'error') {
        dispatch({
          type: 'phase',
          localId,
          phase: 'error',
          patch: {
            errorMessage: outcome.message,
            isRetryable: outcome.isRetryable,
            ...(outcome.uploadId ? { uploadId: outcome.uploadId } : {}),
          },
        })
      }
    },
    [dispatch],
  )

  const run = useCallback(
    async (card: StackCard, session: AbortController): Promise<void> => {
      const photo = card.photo
      if (!photo) return
      const controller = new AbortController()
      const abort = (): void => controller.abort()
      session.signal.addEventListener('abort', abort, { once: true })
      runningRef.current = new Map(runningRef.current).set(card.localId, controller)
      try {
        const outcome = await runStageUpload(
          {
            leagueId,
            signal: controller.signal,
            onPhase: (localId, phase, extra) => {
              dispatch({
                type: 'phase',
                localId,
                phase,
                patch: { progress: extra?.progress, uploadId: extra?.uploadId },
              })
              if (phase === 'sending' && extra?.uploadId) {
                pendingRef.current = new Map(pendingRef.current).set(localId, extra.uploadId)
                invalidateQuota()
              }
              if (phase === 'processing') pendingRef.current = without(pendingRef.current, localId)
            },
          },
          {
            localId: card.localId,
            blob: photo.blob,
            capturedAt: photo.capturedAt,
            uploadId: card.uploadId,
          },
        )
        if (outcome.kind === 'offline') {
          dispatch({ type: 'phase', localId: card.localId, phase: 'queued' })
          await waitForNetwork(controller.signal)
        } else {
          settle(card.localId, outcome)
          if (outcome.kind !== 'cancelled') invalidateQuota()
        }
      } finally {
        session.signal.removeEventListener('abort', abort)
        runningRef.current = new Map(
          [...runningRef.current].filter(([, running]) => running !== controller),
        )
        if (!session.signal.aborted) setVersion((current) => current + 1)
      }
    },
    [dispatch, invalidateQuota, leagueId, settle],
  )

  useEffect(() => {
    const session = sessionRef.current
    if (!session || session.signal.aborted || isStoppedRef.current) return
    const free = PARALLEL_UPLOADS - runningRef.current.size
    if (free <= 0) return
    const next = cards
      .filter(
        (card) =>
          card.phase === 'queued' && card.photo !== null && !runningRef.current.has(card.localId),
      )
      .slice(0, free)
    next.forEach((card) => void run(card, session))
  }, [cards, version, run])

  const abortCard = useCallback((localId: string): void => {
    runningRef.current.get(localId)?.abort()
    pendingRef.current = without(pendingRef.current, localId)
  }, [])

  const abortUnsent = useCallback((): string[] => {
    isStoppedRef.current = true
    runningRef.current.forEach((controller, localId) => {
      if (pendingRef.current.has(localId) || !cardsCompleted(cards, localId)) controller.abort()
    })
    const pending = [...pendingRef.current.values()]
    pendingRef.current = new Map()
    return pending
  }, [cards])

  const abortAll = useCallback((): void => {
    isStoppedRef.current = true
    runningRef.current.forEach((controller) => controller.abort())
    pendingRef.current = new Map()
  }, [])

  return useMemo(() => ({ abortCard, abortUnsent, abortAll }), [abortCard, abortUnsent, abortAll])
}

function cardsCompleted(cards: readonly StackCard[], localId: string): boolean {
  const phase = cards.find((card) => card.localId === localId)?.phase
  return phase === 'processing' || phase === 'staged'
}
