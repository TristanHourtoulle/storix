import { useEffect, useMemo, useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { boosterHistoryInfiniteQueryOptions } from '../booster-history.queries'
import { groupByDay } from '../history-copy'
import { HistoryDay } from './history-day'
import { HistoryStats } from './history-stats'

interface BoosterHistoryListProps {
  leagueId: string
}

/** The viewer's booster history: stats tiles, then openings grouped by day, loaded while scrolling. */
export function BoosterHistoryList({ leagueId }: BoosterHistoryListProps) {
  const query = useInfiniteQuery(boosterHistoryInfiniteQueryOptions(leagueId))
  const { data, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = query
  const sentinelRef = useRef<HTMLDivElement>(null)
  const stats = data?.pages[0]?.stats ?? null
  const groups = useMemo(
    () => groupByDay(data?.pages.flatMap((page) => page.openings) ?? []),
    [data],
  )

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasNextPage || isFetchingNextPage || isFetchNextPageError) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void fetchNextPage()
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage])

  if (query.isPending) return <div className="hstats is-loading" aria-hidden="true" />
  if (!data) {
    return (
      <div role="alert" className="grid justify-items-center gap-3 text-center">
        <p className="m-0 text-sm text-muted">Impossible de charger ton historique.</p>
        <Button variant="ghost" onClick={() => void query.refetch()}>
          Réessayer
        </Button>
      </div>
    )
  }

  return (
    <div className="hlist">
      {stats ? <HistoryStats stats={stats} /> : null}
      {groups.length === 0 ? (
        <p className="m-0 text-center text-sm text-faint">Aucun booster ouvert pour l'instant</p>
      ) : (
        groups.map((group) => <HistoryDay key={group.key} leagueId={leagueId} group={group} />)
      )}
      <div ref={sentinelRef} aria-hidden="true" />
      {isFetchNextPageError ? (
        <Button variant="ghost" onClick={() => void fetchNextPage()} isLoading={isFetchingNextPage}>
          Charger la suite
        </Button>
      ) : null}
    </div>
  )
}
