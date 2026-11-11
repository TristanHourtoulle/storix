import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { MomentCapture } from '@/features/moments/components/moment-capture'
import { latenessLabel } from '@/features/moments/moment-copy'
import { currentMomentQueryOptions } from '@/features/moments/moments.queries'

export const Route = createFileRoute('/_authed/l/$leagueId/moment')({
  remountDeps: ({ params }) => params.leagueId,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(currentMomentQueryOptions(params.leagueId)),
  component: MomentRoute,
})

function MomentRoute() {
  const { leagueId } = Route.useParams()
  const { me } = Route.useRouteContext()
  const { data: moment } = useSuspenseQuery(currentMomentQueryOptions(leagueId))
  const [postedOnArrival] = useState(moment.post)

  if (postedOnArrival !== null) {
    return (
      <main className="moment-preview">
        <p className="moment-preview-text">Tu as déjà posté ce Moment.</p>
        <p className="moment-preview-reward">
          <span
            className={postedOnArrival.lateMinutes === 0 ? 'moment-ontime' : 'moment-late-pill'}
          >
            {latenessLabel(postedOnArrival.lateMinutes)}
          </span>
        </p>
        <Link to="/l/$leagueId" params={{ leagueId }} className="moment-btn is-block">
          Retour à l’accueil
        </Link>
      </main>
    )
  }
  return <MomentCapture leagueId={leagueId} authorName={me.user.displayUsername} />
}
