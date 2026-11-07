import { createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/ui/empty-state'

export const Route = createFileRoute('/_authed/l/$leagueId/cards/$cardId')({
  component: CardDetailPlaceholder,
})

function CardDetailPlaceholder() {
  return (
    <main className="screen">
      <EmptyState
        icon="collection"
        title="Détail de la carte bientôt"
        body="Tu pourras bientôt voir ta carte en grand."
      />
    </main>
  )
}
