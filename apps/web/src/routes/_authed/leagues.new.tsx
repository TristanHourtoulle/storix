import { createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/ui/empty-state'

export const Route = createFileRoute('/_authed/leagues/new')({
  component: () => (
    <main className="screen">
      <EmptyState icon="plus" title="Nouvelle ligue" body="La création de ligue arrive bientôt." />
    </main>
  ),
})
