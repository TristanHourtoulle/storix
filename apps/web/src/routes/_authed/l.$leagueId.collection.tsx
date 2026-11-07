import { createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/ui/empty-state'

export const Route = createFileRoute('/_authed/l/$leagueId/collection')({
  component: Collection,
})

function Collection() {
  return (
    <main className="screen">
      <h1>Collection</h1>
      <EmptyState
        icon="collection"
        title="Ta collection est vide"
        body="Les cartes arriveront ici dès l'ouverture des premiers boosters."
      />
    </main>
  )
}
