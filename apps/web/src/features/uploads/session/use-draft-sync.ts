import { useCallback, useEffect, useRef } from 'react'
import { editUpload } from '../uploads.api'
import { createDraftAutosave, type DraftAutosave } from './draft-autosave'
import { EMPTY_DRAFT_FIELDS, changedFields, fieldsOf, type DraftFields } from './session-fields'
import type { StackCard } from './session-reducer'

const SAVED_PHASES: ReadonlySet<StackCard['phase']> = new Set(['processing', 'staged'])

export interface DraftSyncInput {
  leagueId: string
  cards: readonly StackCard[]
  onConflict: () => void
}

export interface DraftSync {
  flush(): Promise<void>
  forget(uploadId: string): void
}

/**
 * Saves committed card fields to their draft once the upload is completed: the first save is sent at
 * once, later changes go through the debounced autosave. Driven by committed state, so no edit made
 * around the completion is lost.
 */
export function useDraftSync({ leagueId, cards, onConflict }: DraftSyncInput): DraftSync {
  const autosaveRef = useRef<DraftAutosave | null>(null)
  const sentRef = useRef<ReadonlyMap<string, DraftFields>>(new Map())
  const onConflictRef = useRef(onConflict)

  useEffect(() => {
    onConflictRef.current = onConflict
  }, [onConflict])

  useEffect(() => {
    const autosave = createDraftAutosave({
      save: async (uploadId, body) => {
        await editUpload(leagueId, uploadId, body)
      },
      onConflict: () => onConflictRef.current(),
    })
    autosaveRef.current = autosave
    return () => {
      void autosave.flush()
      if (autosaveRef.current === autosave) autosaveRef.current = null
    }
  }, [leagueId])

  useEffect(() => {
    const autosave = autosaveRef.current
    if (!autosave) return
    let hasFirstSave = false
    for (const card of cards) {
      if (!card.uploadId || !SAVED_PHASES.has(card.phase)) continue
      const sent = sentRef.current.get(card.uploadId)
      const current = fieldsOf(card)
      if (!sent && card.photo === null) {
        sentRef.current = new Map(sentRef.current).set(card.uploadId, current)
        continue
      }
      const body = changedFields(sent ?? EMPTY_DRAFT_FIELDS, current)
      if (!body) {
        if (!sent) sentRef.current = new Map(sentRef.current).set(card.uploadId, current)
        continue
      }
      sentRef.current = new Map(sentRef.current).set(card.uploadId, current)
      autosave.schedule(card.uploadId, body)
      hasFirstSave = hasFirstSave || !sent
    }
    if (hasFirstSave) void autosave.flush()
  }, [cards])

  const flush = useCallback(
    (): Promise<void> => autosaveRef.current?.flush() ?? Promise.resolve(),
    [],
  )

  const forget = useCallback((uploadId: string): void => {
    autosaveRef.current?.cancel(uploadId)
    sentRef.current = new Map([...sentRef.current].filter(([id]) => id !== uploadId))
  }, [])

  return { flush, forget }
}
