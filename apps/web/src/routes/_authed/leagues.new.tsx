import { Link, createFileRoute } from '@tanstack/react-router'
import { Icon } from '@/components/ui/icon'
import { TopBar } from '@/components/ui/top-bar'
import { CreateLeagueForm } from '@/features/leagues/components/create-league-form'

export const Route = createFileRoute('/_authed/leagues/new')({
  component: NewLeague,
})

function NewLeague() {
  return (
    <main className="screen">
      <TopBar
        start={
          <Link to="/" aria-label="Retour" className="icon-btn">
            <Icon name="back" className="size-5" />
          </Link>
        }
      />
      <h1>Nouvelle ligue</h1>
      <p className="m-0 text-sm leading-snug text-muted">
        Tu en seras le propriétaire. Invite ensuite tes potes avec un lien.
      </p>
      <CreateLeagueForm />
    </main>
  )
}
