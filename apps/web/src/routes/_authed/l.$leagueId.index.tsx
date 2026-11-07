import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { buttonClassName } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { LeagueHeader } from '@/features/leagues/components/league-header'
import { leagueDetailQueryOptions } from '@/features/leagues/leagues.queries'

export const Route = createFileRoute('/_authed/l/$leagueId/')({
  component: LeagueHome,
})

function LeagueHome() {
  const { leagueId } = Route.useParams()
  const { data: league } = useSuspenseQuery(leagueDetailQueryOptions(leagueId))

  return (
    <main className="screen">
      <LeagueHeader name={league.name} memberCount={league.memberCount} />
      <EmptyState
        icon="dust"
        title="Les boosters arrivent bientôt"
        body="En attendant, invite tes potes dans la ligue."
        action={
          league.permissions.canManageInvitations ? (
            <Link
              to="/l/$leagueId/admin"
              params={{ leagueId }}
              className={buttonClassName({ variant: 'ghost' })}
            >
              Inviter
            </Link>
          ) : undefined
        }
      />
    </main>
  )
}
