import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { userMessage } from '@/features/errors/user-message'
import { preparePhoto, type PreparedPhoto } from './prepare-photo'

export type DraftPhase =
  'preparing' | 'ready' | 'sending' | 'processing' | 'created' | 'duplicate' | 'error'

export interface PhotoDraft {
  id: string
  photo: PreparedPhoto | null
  title: string
  taggedUserIds: readonly string[]
  phase: DraftPhase
  errorMessage: string | null
  isRetryable: boolean
  cardId: string | null
}

export interface PhaseExtra {
  errorMessage?: string | null
  isRetryable?: boolean
  cardId?: string | null
}

export interface DraftOverflow {
  skipped: number
  accepted: number
}

interface DraftsState {
  drafts: readonly PhotoDraft[]
  selectedId: string | null
  overflow: DraftOverflow | null
}

type DraftsAction =
  | { type: 'added'; drafts: readonly PhotoDraft[]; overflow: DraftOverflow | null }
  | { type: 'prepared'; id: string; photo: PreparedPhoto }
  | { type: 'removed'; id: string }
  | { type: 'selected'; id: string }
  | { type: 'titleChanged'; id: string; title: string }
  | { type: 'tagToggled'; id: string; userId: string }
  | { type: 'phaseChanged'; id: string; phase: DraftPhase; extra: PhaseExtra }

const INITIAL_STATE: DraftsState = { drafts: [], selectedId: null, overflow: null }

function updateDraft(
  state: DraftsState,
  id: string,
  update: (draft: PhotoDraft) => PhotoDraft,
): DraftsState {
  return {
    ...state,
    drafts: state.drafts.map((draft) => (draft.id === id ? update(draft) : draft)),
  }
}

function neighbourId(drafts: readonly PhotoDraft[], id: string): string | null {
  const index = drafts.findIndex((draft) => draft.id === id)
  const rest = drafts.filter((draft) => draft.id !== id)
  return rest[Math.min(index, rest.length - 1)]?.id ?? null
}

function reducer(state: DraftsState, action: DraftsAction): DraftsState {
  switch (action.type) {
    case 'added':
      return {
        drafts: [...state.drafts, ...action.drafts],
        selectedId: state.selectedId ?? action.drafts[0]?.id ?? null,
        overflow: action.overflow,
      }
    case 'prepared':
      return updateDraft(state, action.id, (draft) => ({
        ...draft,
        photo: action.photo,
        phase: 'ready',
      }))
    case 'removed':
      return {
        ...state,
        drafts: state.drafts.filter((draft) => draft.id !== action.id),
        selectedId:
          state.selectedId === action.id ? neighbourId(state.drafts, action.id) : state.selectedId,
        overflow: null,
      }
    case 'selected':
      return { ...state, selectedId: action.id }
    case 'titleChanged':
      return updateDraft(state, action.id, (draft) => ({ ...draft, title: action.title }))
    case 'tagToggled':
      return updateDraft(state, action.id, (draft) => ({
        ...draft,
        taggedUserIds: draft.taggedUserIds.includes(action.userId)
          ? draft.taggedUserIds.filter((userId) => userId !== action.userId)
          : [...draft.taggedUserIds, action.userId],
      }))
    case 'phaseChanged':
      return updateDraft(state, action.id, (draft) => ({
        ...draft,
        phase: action.phase,
        errorMessage: action.extra.errorMessage ?? null,
        isRetryable: action.extra.isRetryable ?? false,
        cardId: action.extra.cardId ?? draft.cardId,
      }))
  }
}

function createUrlRegistry() {
  let urls: readonly string[] = []
  return {
    track(url: string): void {
      urls = [...urls, url]
    },
    release(url: string): void {
      URL.revokeObjectURL(url)
      urls = urls.filter((tracked) => tracked !== url)
    },
    releaseAll(): void {
      urls.forEach((url) => URL.revokeObjectURL(url))
      urls = []
    },
  }
}

let draftSequence = 0

function createDraft(): PhotoDraft {
  draftSequence += 1
  return {
    id: `draft-${Date.now().toString(36)}-${draftSequence}`,
    photo: null,
    title: '',
    taggedUserIds: [],
    phase: 'preparing',
    errorMessage: null,
    isRetryable: false,
    cardId: null,
  }
}

/** Counts drafts that will consume an upload slot. */
export function countQueuedDrafts(drafts: readonly PhotoDraft[]): number {
  return drafts.filter((draft) => draft.phase !== 'error' && draft.phase !== 'duplicate').length
}

/** Local drafts of photos to turn into cards, capped at `capacity` remaining uploads. */
export function usePhotoDrafts(capacity: number) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const [urls] = useState(createUrlRegistry)
  const isMountedRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      urls.releaseAll()
    }
  }, [urls])

  const add = useCallback(
    async (files: readonly File[]): Promise<void> => {
      const slots = Math.max(0, capacity - countQueuedDrafts(state.drafts))
      const accepted = files.slice(0, slots)
      const skipped = files.length - accepted.length
      const drafts = accepted.map(createDraft)
      dispatch({
        type: 'added',
        drafts,
        overflow: skipped > 0 ? { skipped, accepted: accepted.length } : null,
      })
      for (const [index, draft] of drafts.entries()) {
        const file = accepted[index]
        if (!file) continue
        try {
          const photo = await preparePhoto(file)
          if (!isMountedRef.current) {
            URL.revokeObjectURL(photo.previewUrl)
            return
          }
          urls.track(photo.previewUrl)
          dispatch({ type: 'prepared', id: draft.id, photo })
        } catch (error) {
          if (!isMountedRef.current) return
          dispatch({
            type: 'phaseChanged',
            id: draft.id,
            phase: 'error',
            extra: { errorMessage: userMessage(error) },
          })
        }
      }
    },
    [capacity, state.drafts, urls],
  )

  const remove = useCallback(
    (id: string): void => {
      const url = state.drafts.find((draft) => draft.id === id)?.photo?.previewUrl
      if (url) urls.release(url)
      dispatch({ type: 'removed', id })
    },
    [state.drafts, urls],
  )

  const select = useCallback((id: string) => dispatch({ type: 'selected', id }), [])
  const setTitle = useCallback(
    (id: string, title: string) => dispatch({ type: 'titleChanged', id, title }),
    [],
  )
  const toggleTag = useCallback(
    (id: string, userId: string) => dispatch({ type: 'tagToggled', id, userId }),
    [],
  )
  const setPhase = useCallback(
    (id: string, phase: DraftPhase, extra: PhaseExtra = {}) =>
      dispatch({ type: 'phaseChanged', id, phase, extra }),
    [],
  )

  return {
    drafts: state.drafts,
    selectedId: state.selectedId,
    overflow: state.overflow,
    add,
    remove,
    select,
    setTitle,
    toggleTag,
    setPhase,
  }
}
