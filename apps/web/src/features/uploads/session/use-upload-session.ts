import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { UploadDraft } from '@storix/shared'
import { userMessage } from '@/features/errors/user-message'
import { purgeMediaPrefixes } from '@/features/privacy/purge-cache'
import { playSound } from '@/features/sound/sound'
import { logger } from '@/lib/logger'
import { preparePhoto } from '../prepare-photo'
import { discardUploads, fetchDrafts } from '../uploads.api'
import { draftsQueryKey } from '../use-drafts'
import type { DraftCapacity } from '../use-photo-drafts'
import { uploadQuotaQueryKey } from '../use-upload-quota'
import { nextLocalId, remoteMediaPrefixes, slotsUsed, type EditPatch } from './session-fields'
import {
  INITIAL_SESSION,
  createStackCard,
  sessionReducer,
  sessionStats,
  type StackCard,
} from './session-reducer'
import { useDraftReconcile } from './use-draft-reconcile'
import { useDraftSync } from './use-draft-sync'
import { useStageQueue } from './use-stage-queue'

const QUOTA_SOUND_DELAY = 0.15

/** Holds the upload stack: picks, background staging, edits with autosave, navigation and discards. */
export function useUploadSession(leagueId: string, capacity: DraftCapacity) {
  const queryClient = useQueryClient()
  const [state, dispatch] = useReducer(sessionReducer, INITIAL_SESSION)
  const stateRef = useRef(state)
  const isMountedRef = useRef(false)
  const urlsRef = useRef<ReadonlySet<string>>(new Set())
  const reconcileRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const releaseRef = useRef<(card: StackCard) => void>(() => undefined)
  const removedRef = useRef<ReadonlySet<string>>(new Set())

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      urlsRef.current = new Set()
    }
  }, [])

  const sync = useDraftSync({
    leagueId,
    cards: state.cards,
    onConflict: useCallback(() => void reconcileRef.current(), []),
  })
  const { flush, forget } = sync
  const queue = useStageQueue({ leagueId, cards: state.cards, dispatch })

  const invalidateDraftQueries = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: uploadQuotaQueryKey(leagueId) })
    void queryClient.invalidateQueries({ queryKey: draftsQueryKey(leagueId) })
  }, [leagueId, queryClient])

  const refreshRemote = useCallback(async (): Promise<void> => {
    const drafts = await fetchDrafts(leagueId)
    if (isMountedRef.current) dispatch({ type: 'resumed', drafts, focus: false })
  }, [leagueId])

  const handleGone = useCallback((uploadIds: readonly string[]): void => {
    const gone = new Set(uploadIds)
    stateRef.current.cards
      .filter((card) => card.uploadId !== null && gone.has(card.uploadId))
      .forEach((card) => releaseRef.current(card))
  }, [])

  const { reconcile } = useDraftReconcile({
    leagueId,
    state,
    stateRef,
    dispatch,
    onStaged: refreshRemote,
    onGone: handleGone,
  })

  useEffect(() => {
    reconcileRef.current = reconcile
  }, [reconcile])

  const trackUrl = useCallback((localId: string, url: string): boolean => {
    if (!isMountedRef.current || removedRef.current.has(localId)) {
      URL.revokeObjectURL(url)
      return false
    }
    urlsRef.current = new Set([...urlsRef.current, url])
    return true
  }, [])

  const add = useCallback(
    async (files: File[]): Promise<void> => {
      const slots = Math.max(0, capacity.slots - slotsUsed(stateRef.current.cards, capacity))
      const accepted = files.slice(0, slots)
      const skipped = files.length - accepted.length
      const cards = accepted.map(() => createStackCard(nextLocalId()))
      dispatch({
        type: 'added',
        cards,
        overflow: skipped > 0 ? { kind: capacity.kind, skipped, accepted: accepted.length } : null,
      })
      if (accepted.length > 0) playSound({ name: 'photoAdded' })
      if (skipped > 0 && capacity.kind === 'dailyQuota') {
        playSound({ name: 'quota' }, accepted.length > 0 ? QUOTA_SOUND_DELAY : 0)
      }
      for (const [index, card] of cards.entries()) {
        const file = accepted[index]
        if (!file) continue
        try {
          const photo = await preparePhoto(file)
          if (trackUrl(card.localId, photo.previewUrl)) {
            dispatch({ type: 'prepared', localId: card.localId, photo })
          }
        } catch (error) {
          if (!isMountedRef.current) return
          dispatch({
            type: 'phase',
            localId: card.localId,
            phase: 'error',
            patch: { errorMessage: userMessage(error), isRetryable: false },
          })
        }
      }
    },
    [capacity, trackUrl],
  )

  const resume = useCallback(
    (drafts: UploadDraft[]): void => dispatch({ type: 'resumed', drafts }),
    [],
  )

  const goTo = useCallback(
    (index: number): void => {
      dispatch({ type: 'navigated', index })
      dispatch({ type: 'screen', screen: 'stack' })
      void flush()
    },
    [flush],
  )

  const next = useCallback((): void => {
    dispatch({ type: 'next' })
    void flush()
  }, [flush])

  const prev = useCallback((): void => {
    dispatch({ type: 'prev' })
    void flush()
  }, [flush])

  const edit = useCallback(
    (localId: string, patch: EditPatch): void => dispatch({ type: 'edited', localId, patch }),
    [],
  )

  const copyPreviousTags = useCallback((localId: string): void => {
    const { cards } = stateRef.current
    const previous = cards[cards.findIndex((card) => card.localId === localId) - 1]
    if (previous)
      dispatch({ type: 'edited', localId, patch: { taggedUserIds: previous.taggedUserIds } })
  }, [])

  const retry = useCallback((localId: string): void => {
    const card = stateRef.current.cards.find((candidate) => candidate.localId === localId)
    if (!card?.photo || card.phase !== 'error' || !card.isRetryable) return
    dispatch({ type: 'phase', localId, phase: 'queued', patch: { progress: 0 } })
  }, [])

  const discard = useCallback(
    async (cards: readonly StackCard[]): Promise<void> => {
      const ids = cards.flatMap((card) => (card.uploadId ? [card.uploadId] : []))
      if (ids.length === 0) return
      try {
        await discardUploads(leagueId, ids)
        await purgeMediaPrefixes(remoteMediaPrefixes(cards))
      } catch (error) {
        logger.warn('Draft discard failed', { count: ids.length, error })
      } finally {
        invalidateDraftQueries()
      }
    },
    [invalidateDraftQueries, leagueId],
  )

  const releaseCard = useCallback(
    (card: StackCard): void => {
      removedRef.current = new Set([...removedRef.current, card.localId])
      queue.abortCard(card.localId)
      if (card.uploadId) forget(card.uploadId)
      const url = card.photo?.previewUrl
      if (url && urlsRef.current.has(url)) {
        URL.revokeObjectURL(url)
        urlsRef.current = new Set([...urlsRef.current].filter((tracked) => tracked !== url))
      }
    },
    [forget, queue],
  )

  useEffect(() => {
    releaseRef.current = releaseCard
  }, [releaseCard])

  const remove = useCallback(
    async (localId: string): Promise<void> => {
      const card = stateRef.current.cards.find((candidate) => candidate.localId === localId)
      if (!card) return
      releaseCard(card)
      dispatch({ type: 'removed', localId })
      await discard([card])
    },
    [discard, releaseCard],
  )

  const abortUnsent = useCallback((): void => {
    const pending = queue.abortUnsent()
    if (pending.length === 0) return
    discardUploads(leagueId, pending, { keepalive: true })
      .catch((error: unknown) => logger.warn('Unsent reservations discard failed', { error }))
      .finally(invalidateDraftQueries)
  }, [invalidateDraftQueries, leagueId, queue])

  const discardAll = useCallback(async (): Promise<void> => {
    const { cards } = stateRef.current
    queue.abortAll()
    cards.forEach(releaseCard)
    cards.forEach((card) => dispatch({ type: 'removed', localId: card.localId }))
    await discard(cards)
  }, [discard, queue, releaseCard])

  const stats = useMemo(() => sessionStats(state), [state])

  return {
    state,
    stats,
    dispatch,
    add,
    resume,
    goTo,
    next,
    prev,
    edit,
    copyPreviousTags,
    retry,
    remove,
    flush,
    abortUnsent,
    discardAll,
  }
}

export type UploadSession = ReturnType<typeof useUploadSession>
