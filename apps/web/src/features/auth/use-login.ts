import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'
import { logger } from '@/lib/logger'
import { purgeAllCaches } from '@/features/privacy/purge-cache'
import { UserFacingError, userMessage } from '@/features/errors/user-message'
import { authErrorMessage } from './auth-errors'

interface LoginInput {
  username: string
  password: string
}

type LoginAttempt = { kind: 'password'; input: LoginInput } | { kind: 'passkey' }

const CANCELLED_CODES = new Set([
  'AUTH_CANCELLED',
  'ERROR_CEREMONY_ABORTED',
  'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY',
])

function isCancellation(error: unknown): boolean {
  return error instanceof Error && (error.name === 'NotAllowedError' || error.name === 'AbortError')
}

async function signInWithPassword(input: LoginInput): Promise<void> {
  const { error } = await authClient.signIn.username(input)
  if (error) throw new UserFacingError(authErrorMessage(error, 'Connexion impossible.'))
}

/** Signs in with a passkey; throws a user-facing error on failure or cancellation. */
export async function signInWithPasskey(): Promise<void> {
  try {
    const result = await authClient.signIn.passkey()
    if (result?.error) {
      const code = 'code' in result.error ? result.error.code : undefined
      logger.warn('Passkey sign-in failed', { code, status: result.error.status })
      const message = CANCELLED_CODES.has(code ?? '')
        ? 'Connexion annulée. Tu peux réessayer quand tu veux.'
        : authErrorMessage(result.error, 'Connexion par passkey impossible.')
      throw new UserFacingError(message)
    }
  } catch (caught) {
    if (isCancellation(caught)) {
      throw new UserFacingError('Connexion annulée. Tu peux réessayer quand tu veux.')
    }
    throw caught
  }
}

/** Signs in with password or passkey, then opens the redirect target or the home screen. */
export function useLogin(redirectTo?: string): {
  loginWithPassword: (input: LoginInput) => Promise<void>
  loginWithPasskey: () => Promise<void>
  isPending: boolean
  error: string | null
} {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const mutation = useMutation({
    mutationFn: async (attempt: LoginAttempt): Promise<void> => {
      if (attempt.kind === 'password') await signInWithPassword(attempt.input)
      else await signInWithPasskey()
    },
    onSuccess: async () => {
      queryClient.clear()
      await purgeAllCaches()
      if (redirectTo) await navigate({ href: redirectTo, replace: true })
      else await navigate({ to: '/', replace: true })
    },
  })

  return {
    loginWithPassword: (input) =>
      mutation.mutateAsync({ kind: 'password', input }).catch(() => undefined),
    loginWithPasskey: () => mutation.mutateAsync({ kind: 'passkey' }).catch(() => undefined),
    isPending: mutation.isPending,
    error: mutation.error ? userMessage(mutation.error) : null,
  }
}
