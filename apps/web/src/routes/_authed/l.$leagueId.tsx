import { Outlet, createFileRoute, redirect, useMatchRoute } from '@tanstack/react-router'
import { BottomNav } from '@/components/ui/bottom-nav'
import { PasskeyPrompt } from '@/features/auth/components/passkey-prompt'
import { IosInstallHint } from '@/features/pwa/components/ios-install-hint'
import { meQueryOptions } from '@/features/auth/session.queries'
import { clearLastLeagueId, useRememberLastLeague } from '@/features/leagues/last-league'
import { loadLeagueDetail } from '@/features/leagues/leagues.queries'

export const Route = createFileRoute('/_authed/l/$leagueId')({
  loader: async ({ context, params, preload }) => {
    const league = await loadLeagueDetail(context.queryClient, params.leagueId)
    if (league) return
    if (!preload) {
      context.queryClient.removeQueries({ queryKey: meQueryOptions.queryKey })
      clearLastLeagueId(context.me.user.id)
    }
    throw redirect({ to: '/' })
  },
  component: LeagueLayout,
})

function LeagueLayout() {
  const { leagueId } = Route.useParams()
  const { me } = Route.useRouteContext()
  const matchRoute = useMatchRoute()
  useRememberLastLeague(me.user.id, leagueId)
  const isBoosterStage = Boolean(matchRoute({ to: '/l/$leagueId/booster', params: { leagueId } }))
  const active = matchRoute({ to: '/l/$leagueId/collection', params: { leagueId } })
    ? 'collection'
    : matchRoute({ to: '/l/$leagueId/add', params: { leagueId } })
      ? 'add'
      : matchRoute({ to: '/l/$leagueId/profile', params: { leagueId } }) ||
          matchRoute({ to: '/l/$leagueId/admin', params: { leagueId } })
        ? 'profile'
        : 'home'

  return (
    <div className="flex min-h-dvh flex-col">
      <Outlet />
      <PasskeyPrompt userId={me.user.id} displayUsername={me.user.displayUsername} />
      {isBoosterStage ? null : (
        <div className="sticky bottom-0 mt-auto">
          <IosInstallHint />
          <BottomNav leagueId={leagueId} active={active} />
        </div>
      )}
    </div>
  )
}
