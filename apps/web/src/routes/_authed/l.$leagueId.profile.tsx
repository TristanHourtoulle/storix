import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Avatar } from '@/components/ui/avatar'
import { Button, buttonClassName } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { ChangePasswordForm } from '@/features/auth/components/change-password-form'
import { PasskeyList } from '@/features/auth/components/passkey-list'
import { DeleteAccountSection } from '@/features/account/components/delete-account-section'
import { meQueryOptions } from '@/features/auth/session.queries'
import { useLogout } from '@/features/auth/use-logout'
import { LeagueList } from '@/features/leagues/components/league-list'
import { useMyLeagues } from '@/features/leagues/use-my-leagues'
import { LeaveLeagueSection } from '@/features/members/components/leave-league-section'

export const Route = createFileRoute('/_authed/l/$leagueId/profile')({
  component: Profile,
})

function Profile() {
  const { leagueId } = Route.useParams()
  const { data: me } = useSuspenseQuery(meQueryOptions)
  const leagues = useMyLeagues()
  const { logout, isPending, errorMessage } = useLogout()

  if (!me) return null
  const currentLeague = leagues.find((league) => league.id === leagueId)

  return (
    <main className="screen">
      <header className="flex items-center gap-3">
        <Avatar label={me.user.displayUsername} size="md" />
        <h1 className="truncate">{me.user.displayUsername}</h1>
      </header>
      <Link
        to="/l/$leagueId/tagged"
        params={{ leagueId }}
        className={buttonClassName({ variant: 'ghost', block: true })}
      >
        Photos où tu apparais
      </Link>
      <PasskeyList displayUsername={me.user.displayUsername} />
      <ChangePasswordForm />
      <LeagueList leagues={leagues} currentLeagueId={leagueId} />
      {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
      <Button variant="ghost" block isLoading={isPending} onClick={() => logout()}>
        Se déconnecter
      </Button>
      {currentLeague ? (
        <LeaveLeagueSection
          userId={me.user.id}
          displayUsername={me.user.displayUsername}
          league={currentLeague}
          isHomeLeague={me.homeLeagueId === currentLeague.id}
        />
      ) : null}
      <DeleteAccountSection userId={me.user.id} username={me.user.username} />
    </main>
  )
}
