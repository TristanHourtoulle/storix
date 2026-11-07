import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { isSafeRedirectPath } from '@/lib/redirect'
import { BrandLogo } from '@/components/ui/brand-logo'
import { LoginForm } from '@/features/auth/components/login-form'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({
    redirect: z.string().refine(isSafeRedirectPath).optional().catch(undefined),
    reset: z.literal('done').optional().catch(undefined),
    signup: z.literal('failed').optional().catch(undefined),
    deleted: z.literal(1).optional().catch(undefined),
  }),
  component: LoginScreen,
})

function LoginScreen() {
  const { redirect, reset, signup, deleted } = Route.useSearch()

  return (
    <main className="screen">
      <BrandLogo size="lg" />
      <h1>Connexion</h1>
      <LoginForm
        {...(redirect ? { redirectTo: redirect } : {})}
        isResetDone={reset === 'done'}
        isSignupFailed={signup === 'failed'}
        isAccountDeleted={deleted === 1}
      />
    </main>
  )
}
