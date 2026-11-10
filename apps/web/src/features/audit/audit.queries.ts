import { infiniteQueryOptions } from '@tanstack/react-query'
import { fetchJournal } from './audit.api'
import { journalCategories, journalFrom, type JournalFilters } from './journal-filters'

/** Root key of every Journal query of a league. */
export function journalQueryKey(leagueId: string) {
  return ['leagues', leagueId, 'admin', 'audit'] as const
}

export function journalInfiniteQueryOptions(leagueId: string, filters: JournalFilters) {
  return infiniteQueryOptions({
    queryKey: [...journalQueryKey(leagueId), filters],
    queryFn: ({ pageParam }) =>
      fetchJournal(leagueId, {
        categories: journalCategories(filters),
        actorId: filters.actorId,
        from: journalFrom(filters.period),
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })
}
