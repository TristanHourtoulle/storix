import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { TaggedCard } from '@storix/shared'
import { taggedCardsQueryOptions } from './withdrawals.queries'

/** Returns the cards the caller appears on. */
export function useTaggedCards(leagueId: string): UseQueryResult<TaggedCard[]> {
  return useQuery(taggedCardsQueryOptions(leagueId))
}
