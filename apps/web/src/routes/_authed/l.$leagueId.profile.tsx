import { createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/ui/empty-state'

export const Route = createFileRoute('/_authed/l/$leagueId/profile')({
  component: () => (
    <main className="screen">
      <EmptyState icon="profile" title="Profil" body="Ton profil arrive bientôt." />
    </main>
  ),
})
