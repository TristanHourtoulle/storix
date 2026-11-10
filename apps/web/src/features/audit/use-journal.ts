import { useCallback } from 'react'
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import type { AuditPage } from '@storix/shared'
import { logger } from '@/lib/logger'
import { markJournalSeen } from './audit.api'
import { journalInfiniteQueryOptions, journalQueryKey } from './audit.queries'
import { DEFAULT_JOURNAL_FILTERS, type JournalFilters } from './journal-filters'

/** The admin Journal for a filter set, loaded 50 entries at a time. */
export function useJournal(leagueId: string, filters: JournalFilters) {
  return useInfiniteQuery({
    ...journalInfiniteQueryOptions(leagueId, filters),
    placeholderData: (previous) => previous,
  })
}

/** Whether failed reset codes arrived since an admin last opened the Journal. */
export function useJournalAlert(leagueId: string, isEnabled: boolean): boolean {
  const { data } = useInfiniteQuery({
    ...journalInfiniteQueryOptions(leagueId, DEFAULT_JOURNAL_FILTERS),
    enabled: isEnabled,
  })
  return data?.pages[0]?.hasUnseenAlerts ?? false
}

/** Records the Journal visit and clears the cached red-dot alert at once. */
export function useMarkJournalSeen(leagueId: string): () => void {
  const queryClient = useQueryClient()
  const { mutate } = useMutation({
    mutationFn: () => markJournalSeen(leagueId),
    onMutate: () => {
      queryClient.setQueriesData<InfiniteData<AuditPage>>(
        { queryKey: journalQueryKey(leagueId) },
        (data) =>
          data === undefined
            ? data
            : {
                ...data,
                pages: data.pages.map((page) => ({ ...page, hasUnseenAlerts: false })),
              },
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: journalQueryKey(leagueId) })
    },
    onError: (error) => {
      logger.warn('Marking the Journal seen failed', { error })
    },
  })
  return useCallback(() => mutate(), [mutate])
}
