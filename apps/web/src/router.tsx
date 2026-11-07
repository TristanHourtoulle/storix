import { createRouter } from '@tanstack/react-router'
import { createQueryClient } from '@/lib/query-client'
import { meQueryOptions } from '@/features/auth/session.queries'
import { routeTree } from './routeTree.gen'

function redirectToLogin(): void {
  const { pathname, href } = router.state.location
  if (pathname.startsWith('/login')) return
  queryClient.setQueryData(meQueryOptions.queryKey, null)
  void router.navigate({ to: '/login', search: { redirect: href } })
}

export const queryClient = createQueryClient(redirectToLogin)

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
