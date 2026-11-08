import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { UploadDraft } from '@storix/shared'
import { userMessage } from '@/features/errors/user-message'
import { purgeMediaPrefixes } from '@/features/privacy/purge-cache'
import { playSound } from '@/features/sound/sound'
import { ApiError } from '@/lib/http'
import { logger } from '@/lib/logger'
import { preparePhoto } from '../prepare-photo'
import { discardUploads, editUpload, fetchDrafts } from '../uploads.api'
import { draftsQueryKey } from '../use-drafts'
import type { DraftCapacity } from '../use-photo-drafts'
import { uploadQuotaQueryKey } from '../use-upload-quota'
import { createDraftAutosave, type DraftAutosave } from './draft-autosave'
import {
  INITIAL_SESSION,
  createStackCard,
  sessionReducer,
  sessionStats,
  type StackCard,
} from './session-reducer'
import {
  filledFields,
  nextLocalId,
  remoteMediaPrefixes,
  slotsUsed,
  toBody,
  type EditPatch,
} from './session-fields'
import { useDraftReconcile } from './use-draft-reconcile'
import { useStageQueue } from './use-stage-queue'

const QUOTA_SOUND_DELAY = 0.15
const SAVED_PHASES: ReadonlySet<StackCard['phase']> = new Set(['processing', 'staged'])

/** Holds the upload stack: picks, background staging, edits with autosave, navigation and discards. */
export function useUploadSession(leagueId: string, capacity: DraftCapacity) {
  const queryClient = useQueryClient()
  const [state, dispatch] = useReducer(sessionReducer, INITIAL_SESSION)
  const stateRef = useRef(state)
  const isMountedRef = useRef(false)
  const urlsRef = useRef<ReadonlySet<string>>(new Set())
  const reconcileRef = useRef<() => Promise<void>>(() => Promise.resolve())

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

  const autosaveRef = useRef<DraftAutosave | null>(null)

  useEffect(() => {
    const autosave = createDraftAutosave({
      save: async (uploadId, body) => {
        await editUpload(leagueId, uploadId, body)
      },
      onConflict: () => void reconcileRef.current(),
    })
    autosaveRef.current = autosave
    return () => {
      void autosave.flush()
      if (autosaveRef.current === autosave) autosaveRef.current = null
    }
  }, [leagueId])

  const invalidateDraftQueries = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: uploadQuotaQueryKey(leagueId) })
    void queryClient.invalidateQueries({ queryKey: draftsQueryKey(leagueId) })
  }, [leagueId, queryClient])

  const handleCompleted = useCallback(
    (localId: string, uploadId: string): void => {
      const card = stateRef.current.cards.find((candidate) => candidate.localId === localId)
      const body = card ? filledFields(card) : null
      if (!body) return
      editUpload(leagueId, uploadId, body).catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 409) void reconcileRef.current()
        else logger.warn('Initial draft save failed', { uploadId, error })
      })
    },
    [leagueId],
  )

  const queue = useStageQueue({
    leagueId,
    cards: state.cards,
    dispatch,
    onCompleted: handleCompleted,
  })

  const refreshRemote = useCallback(async (): Promise<void> => {
    const drafts = await fetchDrafts(leagueId)
    if (isMountedRef.current) dispatch({ type: 'resumed', drafts })
  }, [leagueId])

  const { reconcile } = useDraftReconcile({
    leagueId,
    state,
    stateRef,
    dispatch,
    onStaged: refreshRemote,
    onGone: (uploadIds) => uploadIds.forEach((uploadId) => autosaveRef.current?.cancel(uploadId)),
  })

  useEffect(() => {
    reconcileRef.current = reconcile
  }, [reconcile])

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
          if (!isMountedRef.current) {
            URL.revokeObjectURL(photo.previewUrl)
            return
          }
          urlsRef.current = new Set([...urlsRef.current, photo.previewUrl])
          dispatch({ type: 'prepared', localId: card.localId, photo })
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
    [capacity],
  )

  const resume = useCallback(
    (drafts: UploadDraft[]): void => dispatch({ type: 'resumed', drafts }),
    [],
  )

  const flush = useCallback(
    (): Promise<void> => autosaveRef.current?.flush() ?? Promise.resolve(),
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
    const { index, cards } = stateRef.current
    if (index >= cards.length - 1) dispatch({ type: 'screen', screen: 'summary' })
    else dispatch({ type: 'navigated', index: index + 1 })
    void flush()
  }, [flush])

  const prev = useCallback((): void => {
    dispatch({ type: 'navigated', index: stateRef.current.index - 1 })
    void flush()
  }, [flush])

  const edit = useCallback((localId: string, patch: EditPatch): void => {
    const card = stateRef.current.cards.find((candidate) => candidate.localId === localId)
    dispatch({ type: 'edited', localId, patch })
    if (card?.uploadId && SAVED_PHASES.has(card.phase)) {
      autosaveRef.current?.schedule(card.uploadId, toBody(patch))
    }
  }, [])

  const copyPreviousTags = useCallback(
    (localId: string): void => {
      const { cards } = stateRef.current
      const previous = cards[cards.findIndex((card) => card.localId === localId) - 1]
      if (previous) edit(localId, { taggedUserIds: previous.taggedUserIds })
    },
    [edit],
  )

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
      queue.abortCard(card.localId)
      if (card.uploadId) autosaveRef.current?.cancel(card.uploadId)
      const url = card.photo?.previewUrl
      if (url && urlsRef.current.has(url)) {
        URL.revokeObjectURL(url)
        urlsRef.current = new Set([...urlsRef.current].filter((tracked) => tracked !== url))
      }
    },
    [queue],
  )

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
    abortUnsent: queue.abortUnsent,
    discardAll,
  }
}
