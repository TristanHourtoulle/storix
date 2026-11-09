import { useCallback, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { collectionSortSchema, DEFAULT_COLLECTION_SORT, type CollectionSort } from '@storix/shared'
import { showToast } from '@/components/ui/toast'
import { readStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage'
import { sortLabel } from './collection-sort-labels'

const storedSortSchema = collectionSortSchema

interface StoredSort {
  key: string
  sort: CollectionSort
}

interface CollectionSortState {
  sort: CollectionSort
  pickSort: (next: CollectionSort) => void
}

function readStoredSort(key: string): StoredSort {
  const parsed = storedSortSchema.safeParse(readStorage(key))
  return { key, sort: parsed.success ? parsed.data : DEFAULT_COLLECTION_SORT }
}

/**
 * Resolves the collection sort: the URL `?sort=` wins, then the device choice stored for this
 * league, then rarity. Only `pickSort` writes the device choice; picking rarity clears the URL param.
 */
export function useCollectionSort(
  userId: string,
  leagueId: string,
  urlSort: CollectionSort | undefined,
): CollectionSortState {
  const navigate = useNavigate({ from: '/l/$leagueId/collection' })
  const key = STORAGE_KEYS.collectionSort(userId, leagueId)
  const [stored, setStored] = useState<StoredSort>(() => readStoredSort(key))
  const current = stored.key === key ? stored : readStoredSort(key)
  if (current !== stored) setStored(current)

  const pickSort = useCallback(
    (next: CollectionSort) => {
      writeStorage(key, next)
      setStored({ key, sort: next })
      void navigate({
        search: (prev) => ({ ...prev, sort: next === 'rarity' ? undefined : next }),
        replace: true,
      })
      showToast(`Tri « ${sortLabel(next)} » retenu sur cet appareil`)
    },
    [key, navigate],
  )

  return { sort: urlSort ?? current.sort, pickSort }
}
