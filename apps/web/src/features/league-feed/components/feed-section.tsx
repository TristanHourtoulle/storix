import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { FeedFilter } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { useFeedSeen } from '../use-feed-seen'
import { useHomeFeed } from '../use-league-feed'
import { FeedFilters } from './feed-filters'
import { FeedList } from './feed-list'

interface FeedSectionProps {
  leagueId: string
  meId: string
}

/** "Dans la ligue" on Home: filter chips and the latest feed rows, with a link to the full feed. */
export function FeedSection({ leagueId, meId }: FeedSectionProps) {
  const [filter, setFilter] = useState<FeedFilter>('all')
  const query = useHomeFeed(leagueId, filter)
  useFeedSeen(leagueId)
  const rows = query.data?.rows ?? []

  return (
    <section aria-labelledby="league-feed-title" className="feed-home">
      <div className="feed-secrow">
        <h2 id="league-feed-title">Dans la ligue</h2>
        <Link to="/l/$leagueId/activity" params={{ leagueId }}>
          Tout voir
        </Link>
      </div>
      <FeedFilters value={filter} onChange={setFilter} />
      {query.isPending ? (
        <div className="feed-skeleton" aria-hidden="true" />
      ) : query.isError && rows.length === 0 ? (
        <div role="alert" className="grid justify-items-center gap-3 text-center">
          <p className="m-0 text-sm text-muted">Impossible de charger le fil de la ligue.</p>
          <Button variant="ghost" onClick={() => void query.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="m-0 text-center text-sm text-faint">
          Rien de neuf dans la ligue pour l&apos;instant
        </p>
      ) : (
        <FeedList leagueId={leagueId} meId={meId} rows={rows} />
      )}
    </section>
  )
}
