import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { isSafeRedirectPath } from '@/lib/redirect'
import { EmptyState } from '@/components/ui/empty-state'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({
    redirect: z.string().refine(isSafeRedirectPath).optional().catch(undefined),
  }),
  component: () => (
    <main className="screen">
      <EmptyState icon="profile" title="Connexion" body="L'écran de connexion arrive bientôt." />
    </main>
  ),
})
