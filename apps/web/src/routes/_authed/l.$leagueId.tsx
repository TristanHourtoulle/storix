import { Outlet, createFileRoute, redirect, useMatchRoute } from '@tanstack/react-router'
import { BottomNav } from '@/components/ui/bottom-nav'
import { PasskeyPrompt } from '@/features/auth/components/passkey-prompt'
import { IosInstallHint } from '@/features/pwa/components/ios-install-hint'
import { meQueryOptions } from '@/features/auth/session.queries'
import { clearLastLeagueId, useRememberLastLeague } from '@/features/leagues/last-league'
import { purgeLeagueCaches } from '@/features/privacy/purge-cache'
import { useRemovedCardsSync } from '@/features/privacy/use-removed-cards-sync'
import { loadLeagueDetail } from '@/features/leagues/leagues.queries'

export const Route = createFileRoute('/_authed/l/$leagueId')({
  loader: async ({ context, params, preload }) => {
    const league = await loadLeagueDetail(context.queryClient, params.leagueId)
    if (league) return
    if (!preload) {
      await purgeLeagueCaches(context.queryClient, params.leagueId)
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
  useRemovedCardsSync(me.user.id, leagueId)
  const isBoosterStage = Boolean(matchRoute({ to: '/l/$leagueId/booster', params: { leagueId } }))
  const active = matchRoute({ to: '/l/$leagueId/collection', params: { leagueId } })
    ? 'collection'
    : matchRoute({ to: '/l/$leagueId/add', params: { leagueId } })
      ? 'add'
      : matchRoute({ to: '/l/$leagueId/profile', params: { leagueId }, fuzzy: true }) ||
          matchRoute({ to: '/l/$leagueId/admin', params: { leagueId } })
        ? 'profile'
        : 'home'

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="isolate flex flex-1 flex-col">
        <Outlet />
      </div>
      <PasskeyPrompt userId={me.user.id} displayUsername={me.user.displayUsername} />
      {isBoosterStage ? null : (
        <div className="sticky bottom-0 z-40 mt-auto">
          <IosInstallHint />
          <BottomNav leagueId={leagueId} active={active} />
        </div>
      )}
    </div>
  )
}
