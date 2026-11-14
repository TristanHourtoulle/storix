import type { ImageSet, UploadDraft } from '@storix/shared'
import type { CropRect, ImageSize } from '@storix/shared/domain'
import type { PreparedPhoto } from '../prepare-photo'
import type { DraftOverflow } from '../draft-capacity'

export type StackCardPhase =
  'preparing' | 'queued' | 'sending' | 'processing' | 'staged' | 'duplicate' | 'error'

export interface StackCard {
  localId: string
  uploadId: string | null
  phase: StackCardPhase
  progress: number
  photo: PreparedPhoto | null
  remote: { image: ImageSet; thumbhash: string } | null
  size: ImageSize | null
  capturedAt: string | null
  /** When the photo counts as taken for series (server value for drafts); null means "now". */
  effectiveCapturedAt: string | null
  title: string
  taggedUserIds: readonly string[]
  seriesIds: readonly string[]
  /** Set once the live events matching the capture time were switched on, or the author chose by hand. */
  isPrechecked: boolean
  crop: CropRect | null
  errorMessage: string | null
  isRetryable: boolean
}

export type SessionScreen = 'start' | 'stack' | 'summary' | 'publishing' | 'done'

export interface SessionState {
  cards: readonly StackCard[]
  index: number
  screen: SessionScreen
  overflow: DraftOverflow | null
  notice: string | null
  published: { count: number; duplicates: number } | null
}

export type SessionAction =
  | { type: 'added'; cards: readonly StackCard[]; overflow: DraftOverflow | null }
  | { type: 'resumed'; drafts: readonly UploadDraft[]; focus?: boolean }
  | { type: 'prepared'; localId: string; photo: PreparedPhoto }
  | {
      type: 'phase'
      localId: string
      phase: StackCardPhase
      patch?: Partial<Pick<StackCard, 'uploadId' | 'progress' | 'errorMessage' | 'isRetryable'>>
    }
  | {
      type: 'edited'
      localId: string
      patch: Partial<Pick<StackCard, 'title' | 'taggedUserIds' | 'seriesIds' | 'crop'>>
    }
  | { type: 'prechecked'; localId: string; seriesIds: readonly string[] }
  | { type: 'navigated'; index: number }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'screen'; screen: SessionScreen }
  | { type: 'removed'; localId: string }
  | { type: 'reconciled'; goneUploadIds: readonly string[]; publishedElsewhere: number }
  | { type: 'publishProgress'; count: number; duplicates: number }
  | { type: 'notice'; notice: string | null }

export const INITIAL_SESSION: SessionState = {
  cards: [],
  index: 0,
  screen: 'start',
  overflow: null,
  notice: null,
  published: null,
}

export const PUBLISHED_ELSEWHERE_NOTICE = 'Publiée depuis un autre onglet'

const BUSY_PHASES: ReadonlySet<StackCardPhase> = new Set([
  'preparing',
  'queued',
  'sending',
  'processing',
])
const UNSENT_PHASES: ReadonlySet<StackCardPhase> = new Set(['preparing', 'queued', 'sending'])
const SENT_PHASES: ReadonlySet<StackCardPhase> = new Set(['processing', 'staged'])

/** Creates an empty local card for a picked photo that is still being prepared, in the given series. */
export function createStackCard(localId: string, seriesIds: readonly string[] = []): StackCard {
  return {
    localId,
    uploadId: null,
    phase: 'preparing',
    progress: 0,
    photo: null,
    remote: null,
    size: null,
    capturedAt: null,
    effectiveCapturedAt: null,
    title: '',
    taggedUserIds: [],
    seriesIds,
    isPrechecked: false,
    crop: null,
    errorMessage: null,
    isRetryable: false,
  }
}

/** Tells whether a card has no usable title yet. */
export function isBlankTitle(card: StackCard): boolean {
  return card.title.trim() === ''
}

function clampIndex(index: number, length: number): number {
  return Math.min(Math.max(index, 0), Math.max(length - 1, 0))
}

function updateCard(
  state: SessionState,
  localId: string,
  update: (card: StackCard) => StackCard,
): SessionState {
  return {
    ...state,
    cards: state.cards.map((card) => (card.localId === localId ? update(card) : card)),
  }
}

function withoutCards(state: SessionState, isGone: (card: StackCard) => boolean): SessionState {
  const cards = state.cards.filter((card) => !isGone(card))
  const removedBefore = state.cards.slice(0, state.index).filter(isGone).length
  return {
    ...state,
    cards,
    index: clampIndex(state.index - removedBefore, cards.length),
    screen: cards.length === 0 && isEditingScreen(state.screen) ? 'start' : state.screen,
  }
}

function isEditingScreen(screen: SessionScreen): boolean {
  return screen === 'stack' || screen === 'summary'
}

function cardFromDraft(draft: UploadDraft): StackCard {
  return {
    ...createStackCard(`draft-${draft.uploadId}`),
    uploadId: draft.uploadId,
    phase: draft.status === 'staged' ? 'staged' : 'processing',
    progress: 1,
    remote: draft.media ? { image: draft.media.image, thumbhash: draft.media.thumbhash } : null,
    size: draft.media ? { width: draft.media.width, height: draft.media.height } : null,
    capturedAt: draft.capturedAt,
    effectiveCapturedAt: draft.effectiveCapturedAt,
    title: draft.title ?? '',
    taggedUserIds: draft.taggedUserIds,
    seriesIds: draft.seriesIds,
    isPrechecked: true,
    crop: draft.crop,
  }
}

function mergeDraft(card: StackCard, draft: UploadDraft): StackCard {
  const fresh = cardFromDraft(draft)
  const isStagedNow = card.phase === 'processing' && fresh.phase === 'staged'
  return {
    ...card,
    remote: card.remote ?? fresh.remote,
    size: card.size ?? fresh.size,
    capturedAt: card.capturedAt ?? fresh.capturedAt,
    effectiveCapturedAt: card.effectiveCapturedAt ?? fresh.effectiveCapturedAt,
    phase: isStagedNow ? 'staged' : card.phase,
  }
}

function resume(state: SessionState, drafts: readonly UploadDraft[], focus: boolean): SessionState {
  const byUploadId = new Map(drafts.map((draft) => [draft.uploadId, draft]))
  const known = new Set(state.cards.map((card) => card.uploadId))
  const merged = state.cards.map((card) => {
    const draft = card.uploadId ? byUploadId.get(card.uploadId) : undefined
    return draft ? mergeDraft(card, draft) : card
  })
  const added = drafts.filter((draft) => !known.has(draft.uploadId)).map(cardFromDraft)
  const cards = [...merged, ...added]
  if (added.length === 0 || !focus) return { ...state, cards }
  const firstBlank = cards.findIndex(
    (card) => card.phase !== 'duplicate' && card.phase !== 'error' && isBlankTitle(card),
  )
  return {
    ...state,
    cards,
    index: firstBlank === -1 ? 0 : firstBlank,
    screen: state.screen === 'start' ? 'stack' : state.screen,
  }
}

function applyPhase(
  card: StackCard,
  phase: StackCardPhase,
  patch: Extract<SessionAction, { type: 'phase' }>['patch'] = {},
): StackCard {
  return {
    ...card,
    phase,
    uploadId: patch.uploadId ?? card.uploadId,
    progress: patch.progress ?? (phase === 'sending' ? card.progress : 1),
    errorMessage: phase === 'error' ? (patch.errorMessage ?? card.errorMessage) : null,
    isRetryable: phase === 'error' ? (patch.isRetryable ?? false) : false,
  }
}

/** Pure state transitions of the upload stack. */
export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'added': {
      const wasEmpty = state.cards.length === 0
      return {
        ...state,
        cards: [...state.cards, ...action.cards],
        index: wasEmpty ? 0 : state.index,
        overflow: action.overflow,
        screen: action.cards.length > 0 && state.screen === 'start' ? 'stack' : state.screen,
      }
    }
    case 'resumed':
      return resume(state, action.drafts, action.focus ?? true)
    case 'prepared':
      return updateCard(state, action.localId, (card) => ({
        ...card,
        photo: action.photo,
        phase: 'queued',
        size: { width: action.photo.width, height: action.photo.height },
        capturedAt: action.photo.capturedAt,
        effectiveCapturedAt: action.photo.capturedAt,
      }))
    case 'phase':
      return updateCard(state, action.localId, (card) =>
        applyPhase(card, action.phase, action.patch),
      )
    case 'edited':
      return updateCard(state, action.localId, (card) => ({
        ...card,
        ...action.patch,
        isPrechecked: card.isPrechecked || action.patch.seriesIds !== undefined,
      }))
    case 'prechecked':
      return updateCard(state, action.localId, (card) =>
        card.isPrechecked ? card : { ...card, isPrechecked: true, seriesIds: action.seriesIds },
      )
    case 'navigated':
      return { ...state, index: clampIndex(action.index, state.cards.length) }
    case 'next':
      return state.index >= state.cards.length - 1
        ? { ...state, screen: 'summary' }
        : { ...state, index: state.index + 1 }
    case 'prev':
      return { ...state, index: clampIndex(state.index - 1, state.cards.length) }
    case 'screen':
      return { ...state, screen: action.screen }
    case 'removed':
      return { ...withoutCards(state, (card) => card.localId === action.localId), overflow: null }
    case 'reconciled': {
      const gone = new Set(action.goneUploadIds)
      const next = withoutCards(state, (card) => card.uploadId !== null && gone.has(card.uploadId))
      return action.publishedElsewhere > 0 ? { ...next, notice: PUBLISHED_ELSEWHERE_NOTICE } : next
    }
    case 'publishProgress':
      return { ...state, published: { count: action.count, duplicates: action.duplicates } }
    case 'notice':
      return { ...state, notice: action.notice }
  }
}

/**
 * Derives the counters the stack, the summary and the leave dialog show. `publishable` holds every card
 * that is neither a duplicate nor an error, busy ones included: publish only its `staged` cards, once
 * `busy` is 0 and `missingTitles` is 0.
 */
export function sessionStats(state: SessionState): {
  total: number
  publishable: StackCard[]
  missingTitles: number
  busy: number
  duplicates: number
  errors: number
  sent: number
  unsent: number
} {
  const { cards } = state
  const publishable = cards.filter((card) => card.phase !== 'duplicate' && card.phase !== 'error')
  const count = (phases: ReadonlySet<StackCardPhase>): number =>
    cards.filter((card) => phases.has(card.phase)).length
  return {
    total: cards.length,
    publishable,
    missingTitles: publishable.filter(isBlankTitle).length,
    busy: count(BUSY_PHASES),
    duplicates: cards.filter((card) => card.phase === 'duplicate').length,
    errors: cards.filter((card) => card.phase === 'error').length,
    sent: count(SENT_PHASES),
    unsent: count(UNSENT_PHASES),
  }
}
