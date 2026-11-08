import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button, buttonClassName } from '@/components/ui/button'
import { newBoosterRequestId } from '@/features/game/booster-request'
import { BoosterWidget } from '@/features/game/components/booster-widget'
import { DustBalance } from '@/features/game/components/dust-balance'
import { RecentReveals } from '@/features/game/components/recent-reveals'
import { recentRevealsQueryOptions, walletQueryOptions } from '@/features/game/game.queries'
import { useWallet } from '@/features/game/use-wallet'
import { RemovalNotice } from '@/features/privacy/components/removal-notice'
import { useRemovedCardsSync } from '@/features/privacy/use-removed-cards-sync'
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
  const queryClient = useQueryClient()
  const { data: wallet, isError, refetch, isFetchedAfterMount } = useWallet(leagueId)
  const { data: reveals } = useQuery(recentRevealsQueryOptions(leagueId))
  const leagues = useMyLeagues()
  const { me } = Route.useRouteContext()
  const { notice, acknowledge } = useRemovedCardsSync(me.user.id, leagueId)

  function invalidateWallet() {
    void queryClient.invalidateQueries({ queryKey: walletQueryOptions(leagueId).queryKey })
  }

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
        photo={league.photo}
        memberCount={league.memberCount}
        leagues={leagues}
        currentLeagueId={leagueId}
        trailing={<DustBalance dust={wallet?.dust} />}
      />
      {notice ? (
        <RemovalNotice count={notice.count} dust={notice.dust} onClose={acknowledge} />
      ) : null}
      {wallet ? (
        <BoosterWidget
          wallet={wallet}
          isFresh={isFetchedAfterMount}
          onOpen={openBooster}
          onElapsed={invalidateWallet}
        />
      ) : isError ? (
        <section role="alert" className="hero flex-col justify-center text-center">
          <p className="m-0 text-sm text-muted">Impossible de charger tes boosters.</p>
          <Button variant="ghost" onClick={() => void refetch()}>
            Réessayer
          </Button>
        </section>
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
