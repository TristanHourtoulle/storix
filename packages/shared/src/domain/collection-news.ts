/**
 * Device-side record of the viewer's visits to a league Collection. `baselineAt` is the discovery
 * date (epoch ms) a card must exceed to be new during the open visit, `seenThroughAt` the newest
 * discovery known when the last visit closed, and `seenIds` the new cards opened during the visit.
 */
export interface CollectionVisitState {
  isOpen: boolean
  baselineAt: number | null
  seenThroughAt: number | null
  seenIds: readonly string[]
}

export interface NewsCandidate {
  id: string
  discoveredAt: number
}

export const EMPTY_COLLECTION_VISIT: CollectionVisitState = {
  isOpen: false,
  baselineAt: null,
  seenThroughAt: null,
  seenIds: [],
}

export const MAX_SEEN_IDS = 200

/** Returns the newest discovery date among the candidates, or null when there is none. */
export function newestDiscoveredAt(candidates: readonly NewsCandidate[]): number | null {
  return candidates.reduce<number | null>(
    (newest, candidate) =>
      newest === null || candidate.discoveredAt > newest ? candidate.discoveredAt : newest,
    null,
  )
}

/** Opens a visit: the last close becomes the baseline and the seen ids are cleared. Reopening an open visit keeps it. */
export function openCollectionVisit(state: CollectionVisitState): CollectionVisitState {
  if (state.isOpen) return state
  return { ...state, isOpen: true, baselineAt: state.seenThroughAt, seenIds: [] }
}

/**
 * Closes an open visit, anchoring `seenThroughAt` to the newest server discovery date, never below
 * its previous value or the baseline, and to 0 when the viewer owns no card yet (`null`). An unknown newest date
 * (`undefined`, the latest discoveries are not loaded) keeps the visit open.
 */
export function closeCollectionVisit(
  state: CollectionVisitState,
  newestDiscovered: number | null | undefined,
): CollectionVisitState {
  if (!state.isOpen || newestDiscovered === undefined) return state
  const anchors = [state.seenThroughAt, state.baselineAt, newestDiscovered].filter(
    (value) => value !== null,
  )
  return { ...state, isOpen: false, seenThroughAt: anchors.length === 0 ? 0 : Math.max(...anchors) }
}

/** Marks one card as seen during the visit, keeping the newest `MAX_SEEN_IDS` ids. */
export function markCardSeen(state: CollectionVisitState, cardId: string): CollectionVisitState {
  if (state.seenIds.includes(cardId)) return state
  return { ...state, seenIds: [...state.seenIds, cardId].slice(-MAX_SEEN_IDS) }
}

/** Marks every candidate as seen by raising the baseline to the newest of them and clearing the seen ids. */
export function markAllSeen(
  state: CollectionVisitState,
  candidates: readonly NewsCandidate[],
): CollectionVisitState {
  const newest = newestDiscoveredAt(candidates)
  if (newest === null) return state
  const baselineAt = state.baselineAt === null ? newest : Math.max(state.baselineAt, newest)
  return { ...state, baselineAt, seenIds: [] }
}

/** Returns the ids of the candidates discovered after the baseline and not seen yet, in candidate order. */
export function newCardIds(
  candidates: readonly NewsCandidate[],
  state: CollectionVisitState,
): string[] {
  const { baselineAt } = state
  if (baselineAt === null) return []
  const seen = new Set(state.seenIds)
  return candidates
    .filter((candidate) => candidate.discoveredAt > baselineAt && !seen.has(candidate.id))
    .map((candidate) => candidate.id)
}
