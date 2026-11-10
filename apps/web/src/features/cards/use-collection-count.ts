import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { collectionCountQueryOptions } from './cards.queries'
import type { CollectionFilterState } from './collection-filters'

/** Number of cards the given filters would show, or null until the first count arrives. */
export function useCollectionCount(
  leagueId: string,
  { authorId, tier, hideLocked, upgradable, taggedUserId }: CollectionFilterState,
): number | null {
  const { data } = useQuery({
    ...collectionCountQueryOptions(leagueId, { authorId, tier, upgradable, taggedUserId }),
    placeholderData: keepPreviousData,
  })
  if (!data) return null
  return hideLocked ? data.owned : data.total
}
