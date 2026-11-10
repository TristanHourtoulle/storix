import { useCallback, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { CARD_TIERS, type CardTier, type MemberSummary } from '@storix/shared'
import { readStorage, removeStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage'
import { activeFilterCount, type CollectionFilterState } from './collection-filters'

const storedFiltersSchema = z.object({
  authorId: z.string().min(1).nullable(),
  tier: z.enum(CARD_TIERS).nullable(),
  hideLocked: z.boolean(),
  upgradable: z.boolean(),
})

export interface CollectionFilterSearch {
  author?: string
  tier?: CardTier
  hideLocked?: boolean
  upgradable?: boolean
}

/** Maps a filter state to the collection URL search params, omitting inactive filters. */
export function toFilterSearch(state: CollectionFilterState): CollectionFilterSearch {
  return {
    author: state.authorId ?? undefined,
    tier: state.tier ?? undefined,
    hideLocked: state.hideLocked || undefined,
    upgradable: state.upgradable || undefined,
  }
}

/** Returns true when the URL search carries at least one collection filter. */
export function hasFilterSearch(search: CollectionFilterSearch): boolean {
  return (
    search.author !== undefined ||
    search.tier !== undefined ||
    search.hideLocked !== undefined ||
    search.upgradable !== undefined
  )
}

function parseStored(raw: string | null): CollectionFilterState | null {
  if (raw === null) return null
  try {
    const parsed = storedFiltersSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

/** Reads the filters this device remembered for a user and league, or null when none are valid. */
export function readCollectionFilters(
  userId: string,
  leagueId: string,
): CollectionFilterState | null {
  const stored = parseStored(readStorage(STORAGE_KEYS.collectionFilters(userId, leagueId)))
  return stored && activeFilterCount(stored) > 0 ? stored : null
}

/** Remembers the filters for a user and league, or forgets them when none is active. */
export function saveCollectionFilters(
  userId: string,
  leagueId: string,
  state: CollectionFilterState,
): void {
  const key = STORAGE_KEYS.collectionFilters(userId, leagueId)
  if (activeFilterCount(state) === 0) {
    removeStorage(key)
    return
  }
  writeStorage(key, JSON.stringify(state))
}

/**
 * Keeps the collection filters in sync with this device: explicit URL filters are remembered,
 * `applyFilters` saves before navigating, and a member filter for someone no longer in the league is dropped.
 */
export function usePersistedCollectionFilters(
  userId: string,
  leagueId: string,
  filterState: CollectionFilterState,
  members: readonly MemberSummary[],
): (next: CollectionFilterState) => void {
  const navigate = useNavigate({ from: '/l/$leagueId/collection' })

  const applyFilters = useCallback(
    (next: CollectionFilterState) => {
      saveCollectionFilters(userId, leagueId, next)
      void navigate({
        search: (prev) => ({ ...prev, ...toFilterSearch(next) }),
        replace: true,
      })
    },
    [userId, leagueId, navigate],
  )

  const { authorId, tier, hideLocked, upgradable } = filterState
  const isStaleAuthor =
    authorId !== null && members.length > 0 && !members.some((m) => m.userId === authorId)

  useEffect(() => {
    const current = { authorId, tier, hideLocked, upgradable }
    if (isStaleAuthor) {
      applyFilters({ ...current, authorId: null })
      return
    }
    if (activeFilterCount(current) > 0) saveCollectionFilters(userId, leagueId, current)
  }, [userId, leagueId, authorId, tier, hideLocked, upgradable, isStaleAuthor, applyFilters])

  return applyFilters
}
