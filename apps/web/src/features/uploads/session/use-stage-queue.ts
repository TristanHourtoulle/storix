import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { runStageUpload, waitForNetwork, type StageOutcome } from '../upload-pipeline'
import { uploadQuotaQueryKey } from '../use-upload-quota'
import type { SessionAction, StackCard } from './session-reducer'

const PARALLEL_UPLOADS = 2

export interface StageQueueInput {
  leagueId: string
  cards: readonly StackCard[]
  dispatch: Dispatch<SessionAction>
  onCompleted: (localId: string, uploadId: string) => void
}

export interface StageQueue {
  abortCard(localId: string): void
  abortUnsent(): void
  abortAll(): void
}

/** Runs queued cards through the stage pipeline, two at a time, while the session is mounted. */
export function useStageQueue({
  leagueId,
  cards,
  dispatch,
  onCompleted,
}: StageQueueInput): StageQueue {
  const queryClient = useQueryClient()
  const [version, setVersion] = useState(0)
  const sessionRef = useRef<AbortController | null>(null)
  const runningRef = useRef<ReadonlyMap<string, AbortController>>(new Map())
  const completedRef = useRef<ReadonlySet<string>>(new Set())
  const isStoppedRef = useRef(false)
  const onCompletedRef = useRef(onCompleted)

  useEffect(() => {
    onCompletedRef.current = onCompleted
  }, [onCompleted])

  useEffect(() => {
    const controller = new AbortController()
    sessionRef.current = controller
    isStoppedRef.current = false
    return () => {
      controller.abort()
      runningRef.current.forEach((running) => running.abort())
      runningRef.current = new Map()
    }
  }, [])

  const invalidateQuota = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: uploadQuotaQueryKey(leagueId) })
  }, [leagueId, queryClient])

  const settle = useCallback(
    (localId: string, outcome: StageOutcome): void => {
      if (outcome.kind === 'staged') {
        dispatch({ type: 'phase', localId, phase: 'staged', patch: { uploadId: outcome.uploadId } })
      } else if (outcome.kind === 'duplicate') {
        dispatch({
          type: 'phase',
          localId,
          phase: 'duplicate',
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
              if (phase === 'sending' && extra?.uploadId) invalidateQuota()
              if (phase === 'processing' && extra?.uploadId) {
                completedRef.current = new Set([...completedRef.current, card.localId])
                onCompletedRef.current(localId, extra.uploadId)
              }
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
          await waitForNetwork(session.signal)
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
  }, [])

  const abortUnsent = useCallback((): void => {
    isStoppedRef.current = true
    runningRef.current.forEach((controller, localId) => {
      if (!completedRef.current.has(localId)) controller.abort()
    })
  }, [])

  const abortAll = useCallback((): void => {
    isStoppedRef.current = true
    runningRef.current.forEach((controller) => controller.abort())
  }, [])

  return useMemo(() => ({ abortCard, abortUnsent, abortAll }), [abortCard, abortUnsent, abortAll])
}
