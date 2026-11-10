import { createRouter } from '@tanstack/react-router'
import { purgeAllCaches } from '@/features/privacy/purge-cache'
import { isPublicPath } from '@/lib/redirect'
import { isLoggingOut } from '@/lib/session-state'
import { createQueryClient } from '@/lib/query-client'
import { meQueryOptions } from '@/features/auth/session.queries'
import { routeTree } from './routeTree.gen'

function redirectToLogin(): void {
  if (isLoggingOut()) return
  const { pathname, href } = router.latestLocation
  if (isPublicPath(pathname)) return
  queryClient.removeQueries({ queryKey: meQueryOptions.queryKey })
  void router
    .navigate({ to: '/login', search: { redirect: href } })
    .then(() => queryClient.cancelQueries())
    .then(() => queryClient.clear())
    .then(() => purgeAllCaches())
}

export const queryClient = createQueryClient(redirectToLogin)

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  scrollRestoration: true,
  getScrollRestorationKey: (location) => location.pathname,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
