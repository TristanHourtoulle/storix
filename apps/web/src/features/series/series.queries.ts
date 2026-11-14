import { queryOptions, type QueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { fetchSeries, fetchSeriesShelf, fetchThemeCard } from './series.api'

const SERIES_STALE_MS = 30_000

/** Root key of every series query of a league. */
export function seriesQueryKey(leagueId: string) {
  return ['leagues', leagueId, 'series'] as const
}

export function seriesShelfQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: [...seriesQueryKey(leagueId), 'shelf'],
    queryFn: () => fetchSeriesShelf(leagueId),
    staleTime: SERIES_STALE_MS,
  })
}

export function themeCardQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: [...seriesQueryKey(leagueId), 'theme'],
    queryFn: () => fetchThemeCard(leagueId),
    staleTime: SERIES_STALE_MS,
  })
}

export function seriesDetailQueryOptions(leagueId: string, seriesId: string) {
  return queryOptions({
    queryKey: [...seriesQueryKey(leagueId), 'detail', seriesId],
    queryFn: () => fetchSeries(leagueId, seriesId),
    staleTime: SERIES_STALE_MS,
  })
}

/** Refetches every series view of a league after a change that may move a series. */
export function refreshSeries(queryClient: QueryClient, leagueId: string): void {
  void queryClient
    .invalidateQueries({ queryKey: seriesQueryKey(leagueId) })
    .catch((error: unknown) => {
      logger.warn('Series refresh failed', { error })
    })
}
