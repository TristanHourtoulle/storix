import type { QueryClient } from '@tanstack/react-query'
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { EmptyState } from '@/components/ui/empty-state'
import { RotateOverlay } from '@/features/pwa/components/rotate-overlay'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: () => (
    <main className="screen">
      <EmptyState
        icon="home"
        title="Page introuvable"
        body="Cette page n'existe pas."
        action={
          <Link to="/" className="text-accent-hover">
            Retour à l'accueil
          </Link>
        }
      />
    </main>
  ),
})

function RootLayout() {
  return (
    <>
      <Outlet />
      <RotateOverlay />
    </>
  )
}
