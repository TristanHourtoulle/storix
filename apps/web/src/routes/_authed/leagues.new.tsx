import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Notice } from '@/components/ui/notice'
import { TopBar } from '@/components/ui/top-bar'
import { meQueryOptions } from '@/features/auth/session.queries'
import { useLogout } from '@/features/auth/use-logout'
import { CreateLeagueForm } from '@/features/leagues/components/create-league-form'

export const Route = createFileRoute('/_authed/leagues/new')({
  component: NewLeague,
})

function NewLeague() {
  const { data: me } = useSuspenseQuery(meQueryOptions)
  const { logout, isPending, errorMessage } = useLogout()
  const hasLeagues = (me?.leagues.length ?? 0) > 0

  return (
    <main className="screen">
      <TopBar
        start={
          hasLeagues ? (
            <Link to="/" aria-label="Retour" className="icon-btn">
              <Icon name="back" className="size-5" />
            </Link>
          ) : undefined
        }
      />
      <h1>Nouvelle ligue</h1>
      <p className="m-0 text-sm leading-snug text-muted">
        Tu en seras le propriétaire. Invite ensuite tes potes avec un lien.
      </p>
      <CreateLeagueForm />
      {hasLeagues ? null : (
        <>
          {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
          <Button variant="ghost" block isLoading={isPending} onClick={() => logout()}>
            Se déconnecter
          </Button>
        </>
      )}
    </main>
  )
}
