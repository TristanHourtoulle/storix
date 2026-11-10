import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import type { FeedFilter } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { FeedFilters } from '@/features/league-feed/components/feed-filters'
import { FeedList } from '@/features/league-feed/components/feed-list'
import { useFullFeed } from '@/features/league-feed/use-league-feed'
import { useMyLeagues } from '@/features/leagues/use-my-leagues'
import { ProfileSubPage } from '@/features/profile/components/profile-sub-page'

export const Route = createFileRoute('/_authed/l/$leagueId/activity')({
  component: ActivityScreen,
})

function ActivityScreen() {
  const { leagueId } = Route.useParams()
  const { me } = Route.useRouteContext()
  const leagueName = useMyLeagues().find((league) => league.id === leagueId)?.name
  const [filter, setFilter] = useState<FeedFilter>('all')
  const query = useFullFeed(leagueId, filter)
  const { data, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = query
  const sentinelRef = useRef<HTMLDivElement>(null)
  const rows = data?.pages.flatMap((page) => page.rows) ?? []

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

  return (
    <ProfileSubPage
      leagueId={leagueId}
      title="Dans la ligue"
      subtitle={leagueName ? `${leagueName} · 30 derniers jours` : undefined}
      backLabel="Retour"
      fallback="home"
    >
      <FeedFilters value={filter} onChange={setFilter} />
      {query.isPending ? (
        <div className="feed-skeleton" aria-hidden="true" />
      ) : !data ? (
        <div role="alert" className="grid justify-items-center gap-3 text-center">
          <p className="m-0 text-sm text-muted">Impossible de charger le fil de la ligue.</p>
          <Button variant="ghost" onClick={() => void query.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="m-0 text-center text-sm text-faint">
          Rien dans la ligue ces 30 derniers jours
        </p>
      ) : (
        <FeedList leagueId={leagueId} meId={me.user.id} rows={rows} />
      )}
      <div ref={sentinelRef} aria-hidden="true" />
      {isFetchNextPageError ? (
        <Button variant="ghost" onClick={() => void fetchNextPage()} isLoading={isFetchingNextPage}>
          Charger la suite
        </Button>
      ) : null}
    </ProfileSubPage>
  )
}
