import { describe, expect, it } from 'vitest'
import {
  EMPTY_COLLECTION_VISIT,
  MAX_SEEN_IDS,
  closeCollectionVisit,
  markAllSeen,
  markCardSeen,
  newCardIds,
  newestDiscoveredAt,
  openCollectionVisit,
  type CollectionVisitState,
} from './collection-news'

const visited = (seenThroughAt: number): CollectionVisitState => ({
  ...EMPTY_COLLECTION_VISIT,
  seenThroughAt,
})

const candidates = [
  { id: 'c60', discoveredAt: 60 },
  { id: 'c50', discoveredAt: 50 },
  { id: 'c40', discoveredAt: 40 },
]

describe('collection visit', () => {
  it('first visit marks nothing new', () => {
    const state = openCollectionVisit(EMPTY_COLLECTION_VISIT)
    expect(state.isOpen).toBe(true)
    expect(state.baselineAt).toBeNull()
    expect(newCardIds([{ id: 'a', discoveredAt: 5 }], state)).toEqual([])
  })

  it('close anchors seenThroughAt to the newest discovery', () => {
    const closed = closeCollectionVisit(openCollectionVisit(EMPTY_COLLECTION_VISIT), 50)
    expect(closed.seenThroughAt).toBe(50)
    expect(closed.isOpen).toBe(false)
  })

  it('close never lowers seenThroughAt', () => {
    const closed = closeCollectionVisit(openCollectionVisit(visited(50)), 40)
    expect(closed.seenThroughAt).toBe(50)
  })

  it('close with no owned card anchors to 0', () => {
    const closed = closeCollectionVisit(openCollectionVisit(EMPTY_COLLECTION_VISIT), null)
    expect(closed.seenThroughAt).toBe(0)
    const next = openCollectionVisit(closed)
    expect(newCardIds([{ id: 'first', discoveredAt: 1 }], next)).toEqual(['first'])
  })

  it('close is a no-op when not open', () => {
    const state = visited(50)
    expect(closeCollectionVisit(state, 90)).toBe(state)
  })

  it('next visit flags only later discoveries', () => {
    const state = openCollectionVisit(visited(50))
    expect(state.baselineAt).toBe(50)
    expect(newCardIds(candidates, state)).toEqual(['c60'])
  })

  it('keeps the candidate order', () => {
    const state = openCollectionVisit(visited(10))
    expect(newCardIds(candidates, state)).toEqual(['c60', 'c50', 'c40'])
  })

  it('reopening while open keeps baseline and seen ids', () => {
    const open = markCardSeen(openCollectionVisit(visited(30)), 'c60')
    const reopened = openCollectionVisit(open)
    expect(reopened).toBe(open)
    expect(newCardIds(candidates, reopened)).toEqual(['c50', 'c40'])
  })

  it('opening clears seen ids', () => {
    const closed = closeCollectionVisit(markCardSeen(openCollectionVisit(visited(30)), 'c60'), 60)
    expect(closed.seenIds).toEqual(['c60'])
    expect(openCollectionVisit(closed).seenIds).toEqual([])
  })

  it('markCardSeen hides one card and is idempotent', () => {
    const state = markCardSeen(openCollectionVisit(visited(30)), 'c50')
    expect(newCardIds(candidates, state)).toEqual(['c60', 'c40'])
    expect(markCardSeen(state, 'c50')).toBe(state)
  })

  it('markCardSeen keeps the newest 200 ids', () => {
    const state = Array.from({ length: 205 }, (_, i) => `id${String(i)}`).reduce(
      markCardSeen,
      openCollectionVisit(visited(0)),
    )
    expect(state.seenIds).toHaveLength(MAX_SEEN_IDS)
    expect(state.seenIds[0]).toBe('id5')
    expect(state.seenIds.at(-1)).toBe('id204')
  })

  it('markAllSeen raises baseline to the newest candidate and clears seen ids', () => {
    const state = markAllSeen(markCardSeen(openCollectionVisit(visited(30)), 'c40'), candidates)
    expect(state.baselineAt).toBe(60)
    expect(state.seenIds).toEqual([])
    expect(newCardIds(candidates, state)).toEqual([])
    expect(newCardIds([{ id: 'c70', discoveredAt: 70 }, ...candidates], state)).toEqual(['c70'])
  })

  it('markAllSeen with no candidate leaves the state unchanged', () => {
    const state = openCollectionVisit(visited(30))
    expect(markAllSeen(state, [])).toBe(state)
  })

  it('newestDiscoveredAt returns the latest date or null', () => {
    expect(newestDiscoveredAt(candidates)).toBe(60)
    expect(newestDiscoveredAt([])).toBeNull()
  })

  it('inputs are not mutated', () => {
    const state = Object.freeze({
      ...openCollectionVisit(visited(30)),
      seenIds: Object.freeze(['c40']),
    })
    const frozen = Object.freeze(candidates.map((candidate) => Object.freeze({ ...candidate })))
    expect(() => {
      markCardSeen(state, 'c50')
      markAllSeen(state, frozen)
      closeCollectionVisit(state, 60)
      openCollectionVisit(closeCollectionVisit(state, 60))
      newCardIds(frozen, state)
      newestDiscoveredAt(frozen)
    }).not.toThrow()
    expect(state.seenIds).toEqual(['c40'])
  })
})
