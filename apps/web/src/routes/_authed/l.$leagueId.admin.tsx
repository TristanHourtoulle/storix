import { createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/ui/empty-state'

export const Route = createFileRoute('/_authed/l/$leagueId/admin')({
  component: () => (
    <main className="screen">
      <EmptyState icon="share" title="Administration" body="L'administration arrive bientôt." />
    </main>
  ),
})
