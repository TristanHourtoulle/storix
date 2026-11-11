import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { meQueryOptions } from '@/features/auth/session.queries'
import { StyleProvider } from '@/features/cosmetics/style-context'

function AuthedLayout() {
  return (
    <StyleProvider>
      <Outlet />
    </StyleProvider>
  )
}

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient.ensureQueryData(meQueryOptions)
    if (!me) throw redirect({ to: '/login', search: { redirect: location.href } })
    return { me }
  },
  component: AuthedLayout,
})
