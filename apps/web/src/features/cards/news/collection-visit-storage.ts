import {
  EMPTY_COLLECTION_VISIT,
  MAX_SEEN_IDS,
  type CollectionCard,
  type CollectionVisitState,
  type NewsCandidate,
} from '@storix/shared'
import { z } from 'zod'
import { readStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage'

const epochMsSchema = z.number().int().min(0)

const visitStateSchema = z.object({
  isOpen: z.boolean(),
  baselineAt: epochMsSchema.nullable(),
  seenThroughAt: epochMsSchema.nullable(),
  seenIds: z.array(z.string()).max(MAX_SEEN_IDS),
})

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Reads the stored Collection visit of a user in a league, falling back to the empty state. */
export function readCollectionVisit(userId: string, leagueId: string): CollectionVisitState {
  const raw = readStorage(STORAGE_KEYS.collectionVisit(userId, leagueId))
  if (raw === null) return EMPTY_COLLECTION_VISIT
  const parsed = visitStateSchema.safeParse(parseJson(raw))
  return parsed.success ? parsed.data : EMPTY_COLLECTION_VISIT
}

/** Stores the Collection visit of a user in a league. */
export function writeCollectionVisit(
  userId: string,
  leagueId: string,
  state: CollectionVisitState,
): void {
  writeStorage(STORAGE_KEYS.collectionVisit(userId, leagueId), JSON.stringify(state))
}

/** Keeps the owned cards as NEW candidates, with their discovery date in epoch ms. */
export function toNewsCandidates(cards: readonly CollectionCard[]): NewsCandidate[] {
  return cards.flatMap((card) =>
    card.kind === 'owned' ? [{ id: card.id, discoveredAt: Date.parse(card.discoveredAt) }] : [],
  )
}
