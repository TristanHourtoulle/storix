import { useCallback, useEffect, useRef } from 'react'
import type { EditUploadBody } from '@storix/shared'
import { editUpload } from '../uploads.api'
import { createDraftAutosave, type DraftAutosave } from './draft-autosave'
import { EMPTY_DRAFT_FIELDS, changedFields, fieldsOf, type DraftFields } from './session-fields'
import type { StackCard } from './session-reducer'

const SAVED_PHASES: ReadonlySet<StackCard['phase']> = new Set(['processing', 'staged'])

export interface DraftSyncInput {
  leagueId: string
  cards: readonly StackCard[]
  onConflict: () => void
  /** Called when the server kept fewer series than sent, e.g. because the theme ended. */
  onSeriesDropped: (uploadId: string, kept: readonly string[]) => void
}

export interface DraftSync {
  /** Sends every unsaved field, dropped saves included; resolves false when a save failed. */
  flush(): Promise<boolean>
  forget(uploadId: string): void
}

function currentValues(fields: DraftFields, keys: readonly string[]): EditUploadBody {
  return {
    ...(keys.includes('title') ? { title: fields.title } : {}),
    ...(keys.includes('taggedUserIds') ? { taggedUserIds: [...fields.taggedUserIds] } : {}),
    ...(keys.includes('seriesIds') ? { seriesIds: [...fields.seriesIds] } : {}),
    ...(keys.includes('crop') ? { crop: fields.crop } : {}),
  }
}

/**
 * Saves committed card fields to their draft once the upload is completed: the first save is sent at
 * once, later changes go through the debounced autosave. Driven by committed state, so no edit made
 * around the completion is lost. A save dropped after its retry leaves its fields unsynced, and they
 * are sent again with the next change or flush.
 */
export function useDraftSync({
  leagueId,
  cards,
  onConflict,
  onSeriesDropped,
}: DraftSyncInput): DraftSync {
  const autosaveRef = useRef<DraftAutosave | null>(null)
  const sentRef = useRef<ReadonlyMap<string, DraftFields>>(new Map())
  const unsyncedRef = useRef<ReadonlyMap<string, readonly string[]>>(new Map())
  const cardsRef = useRef(cards)
  const onConflictRef = useRef(onConflict)
  const onSeriesDroppedRef = useRef(onSeriesDropped)

  useEffect(() => {
    onConflictRef.current = onConflict
    onSeriesDroppedRef.current = onSeriesDropped
  }, [onConflict, onSeriesDropped])

  useEffect(() => {
    const autosave = createDraftAutosave({
      save: async (uploadId, body) => {
        const edited = await editUpload(leagueId, uploadId, body)
        if (body.seriesIds !== undefined && edited.seriesIds.length < body.seriesIds.length) {
          onSeriesDroppedRef.current(uploadId, edited.seriesIds)
        }
      },
      onConflict: () => onConflictRef.current(),
      onDropped: (uploadId, body) => {
        const keys = new Set([...(unsyncedRef.current.get(uploadId) ?? []), ...Object.keys(body)])
        unsyncedRef.current = new Map(unsyncedRef.current).set(uploadId, [...keys])
      },
    })
    autosaveRef.current = autosave
    return () => {
      void autosave.flush()
      if (autosaveRef.current === autosave) autosaveRef.current = null
    }
  }, [leagueId])

  const sync = useCallback((current: readonly StackCard[]): boolean => {
    const autosave = autosaveRef.current
    if (!autosave) return false
    let hasFirstSave = false
    for (const card of current) {
      if (!card.uploadId || !SAVED_PHASES.has(card.phase)) continue
      const sent = sentRef.current.get(card.uploadId)
      const fields = fieldsOf(card)
      if (!sent && card.photo === null) {
        sentRef.current = new Map(sentRef.current).set(card.uploadId, fields)
        continue
      }
      const unsynced = unsyncedRef.current.get(card.uploadId) ?? []
      const changed = changedFields(sent ?? EMPTY_DRAFT_FIELDS, fields)
      const body = { ...currentValues(fields, unsynced), ...changed }
      sentRef.current = new Map(sentRef.current).set(card.uploadId, fields)
      if (Object.keys(body).length === 0) continue
      unsyncedRef.current = new Map([...unsyncedRef.current].filter(([id]) => id !== card.uploadId))
      autosave.schedule(card.uploadId, body)
      hasFirstSave = hasFirstSave || !sent
    }
    return hasFirstSave
  }, [])

  useEffect(() => {
    cardsRef.current = cards
    if (sync(cards)) void autosaveRef.current?.flush()
  }, [cards, sync])

  const flush = useCallback(async (): Promise<boolean> => {
    const autosave = autosaveRef.current
    if (!autosave) return true
    sync(cardsRef.current)
    const isSaved = await autosave.flush()
    return isSaved && unsyncedRef.current.size === 0
  }, [sync])

  const forget = useCallback((uploadId: string): void => {
    autosaveRef.current?.cancel(uploadId)
    sentRef.current = new Map([...sentRef.current].filter(([id]) => id !== uploadId))
    unsyncedRef.current = new Map([...unsyncedRef.current].filter(([id]) => id !== uploadId))
  }, [])

  return { flush, forget }
}
