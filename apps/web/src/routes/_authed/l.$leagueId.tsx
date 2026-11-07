import { Outlet, createFileRoute, redirect, useMatchRoute } from '@tanstack/react-router'
import { BottomNav } from '@/components/ui/bottom-nav'
import { PasskeyPrompt } from '@/features/auth/components/passkey-prompt'
import { IosInstallHint } from '@/features/pwa/components/ios-install-hint'
import { loadLeagueDetail } from '@/features/leagues/leagues.queries'
import { STORAGE_KEYS, writeStorage } from '@/lib/storage'

export const Route = createFileRoute('/_authed/l/$leagueId')({
  loader: async ({ context, params }) => {
    const league = await loadLeagueDetail(context.queryClient, params.leagueId)
    if (!league) throw redirect({ to: '/' })
    writeStorage(STORAGE_KEYS.lastLeagueId, league.id)
  },
  component: LeagueLayout,
})

function LeagueLayout() {
  const { leagueId } = Route.useParams()
  const { me } = Route.useRouteContext()
  const matchRoute = useMatchRoute()
  const active = matchRoute({ to: '/l/$leagueId/collection', params: { leagueId } })
    ? 'collection'
    : matchRoute({ to: '/l/$leagueId/add', params: { leagueId } })
      ? 'add'
      : matchRoute({ to: '/l/$leagueId/profile', params: { leagueId } })
        ? 'profile'
        : 'home'

  return (
    <div className="flex min-h-dvh flex-col">
      <Outlet />
      <IosInstallHint />
      <PasskeyPrompt userId={me.user.id} />
      <BottomNav leagueId={leagueId} active={active} />
    </div>
  )
}
