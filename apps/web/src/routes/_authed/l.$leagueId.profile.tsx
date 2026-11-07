import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { ChangePasswordForm } from '@/features/auth/components/change-password-form'
import { PasskeyList } from '@/features/auth/components/passkey-list'
import { meQueryOptions } from '@/features/auth/session.queries'
import { useLogout } from '@/features/auth/use-logout'
import { LeagueList } from '@/features/leagues/components/league-list'
import { leagueDetailQueryOptions } from '@/features/leagues/leagues.queries'

export const Route = createFileRoute('/_authed/l/$leagueId/profile')({
  component: Profile,
})

function Profile() {
  const { leagueId } = Route.useParams()
  const { data: me } = useSuspenseQuery(meQueryOptions)
  const { data: league } = useSuspenseQuery(leagueDetailQueryOptions(leagueId))
  const { logout, isPending, errorMessage } = useLogout()

  if (!me) return null

  return (
    <main className="screen">
      <header className="flex items-center gap-3">
        <Avatar label={me.user.displayUsername} size="md" />
        <h1 className="truncate">{me.user.displayUsername}</h1>
      </header>
      <PasskeyList displayUsername={me.user.displayUsername} />
      <ChangePasswordForm />
      <LeagueList
        leagues={me.leagues}
        currentLeagueId={leagueId}
        canAdministerCurrent={league.myRole !== 'member'}
      />
      {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
      <Button variant="ghost" block isLoading={isPending} onClick={() => logout()}>
        Se déconnecter
      </Button>
    </main>
  )
}
