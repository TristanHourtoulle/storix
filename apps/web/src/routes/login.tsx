import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { EmptyState } from '@/components/ui/empty-state'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: () => (
    <main className="screen">
      <EmptyState icon="profile" title="Connexion" body="L'écran de connexion arrive bientôt." />
    </main>
  ),
})
