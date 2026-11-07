import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { buttonClassName } from '@/components/ui/button'
import { newBoosterRequestId } from '@/features/game/booster-request'
import { BoosterWidget } from '@/features/game/components/booster-widget'
import { DustBalance } from '@/features/game/components/dust-balance'
import { PityBar } from '@/features/game/components/pity-bar'
import { RecentReveals } from '@/features/game/components/recent-reveals'
import { recentRevealsQueryOptions } from '@/features/game/game.queries'
import { useWallet } from '@/features/game/use-wallet'
import { LeagueHeader } from '@/features/leagues/components/league-header'
import { useMyLeagues } from '@/features/leagues/use-my-leagues'
import { leagueDetailQueryOptions } from '@/features/leagues/leagues.queries'

export const Route = createFileRoute('/_authed/l/$leagueId/')({
  component: LeagueHome,
})

function LeagueHome() {
  const { leagueId } = Route.useParams()
  const navigate = useNavigate()
  const { data: league } = useSuspenseQuery(leagueDetailQueryOptions(leagueId))
  const { data: wallet } = useWallet(leagueId)
  const { data: reveals } = useQuery(recentRevealsQueryOptions(leagueId))
  const leagues = useMyLeagues()

  function openBooster() {
    void navigate({
      to: '/l/$leagueId/booster',
      params: { leagueId },
      search: { request: newBoosterRequestId() },
    })
  }

  return (
    <main className="screen">
      <LeagueHeader
        name={league.name}
        memberCount={league.memberCount}
        leagues={leagues}
        currentLeagueId={leagueId}
        trailing={<DustBalance dust={wallet?.dust} />}
      />
      {wallet ? (
        <>
          <BoosterWidget
            leagueId={leagueId}
            wallet={wallet}
            onOpen={openBooster}
            isPoolEmpty={false}
          />
          <PityBar pity={wallet.pity} />
        </>
      ) : (
        <div aria-hidden="true" className="hero" />
      )}
      {league.memberCount === 1 && league.permissions.canManageInvitations ? (
        <Link
          to="/l/$leagueId/admin"
          params={{ leagueId }}
          className={buttonClassName({ variant: 'ghost', block: true })}
        >
          Inviter
        </Link>
      ) : null}
      {reveals ? <RecentReveals reveals={reveals} /> : null}
    </main>
  )
}
