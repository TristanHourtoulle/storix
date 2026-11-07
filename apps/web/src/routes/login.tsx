import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { isSafeRedirectPath } from '@/lib/redirect'
import { BrandMark } from '@/components/ui/brand-mark'
import { LoginForm } from '@/features/auth/components/login-form'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({
    redirect: z.string().refine(isSafeRedirectPath).optional().catch(undefined),
    reset: z.literal('done').optional().catch(undefined),
  }),
  component: LoginScreen,
})

function LoginScreen() {
  const { redirect, reset } = Route.useSearch()

  return (
    <main className="screen">
      <BrandMark />
      <h1>Connexion</h1>
      <LoginForm {...(redirect ? { redirectTo: redirect } : {})} isResetDone={reset === 'done'} />
    </main>
  )
}
