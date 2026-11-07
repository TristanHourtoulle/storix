import { createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/ui/empty-state'

export const Route = createFileRoute('/_authed/l/$leagueId/add')({
  component: AddPhotos,
})

function AddPhotos() {
  return (
    <main className="screen">
      <EmptyState
        icon="plus"
        title="Ajout de photos bientôt"
        body="Tu pourras bientôt transformer tes photos en cartes."
      />
    </main>
  )
}
