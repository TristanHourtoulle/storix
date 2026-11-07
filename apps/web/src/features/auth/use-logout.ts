import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'
import { purgeAllCaches } from '@/features/privacy/purge-cache'
import { setLoggingOut } from '@/lib/session-state'
import { authErrorMessage } from './auth-errors'

/** Signs out, returns to the login screen, then clears every cached query. */
export function useLogout(): {
  logout: () => Promise<void>
  isPending: boolean
  errorMessage: string | null
} {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const mutation = useMutation({
    mutationFn: async (): Promise<void> => {
      setLoggingOut(true)
      try {
        const { error } = await authClient.signOut()
        if (error) throw new Error(authErrorMessage(error, 'Impossible de te déconnecter.'))
        await navigate({ to: '/login', replace: true })
        await queryClient.cancelQueries()
        queryClient.clear()
        await purgeAllCaches()
      } finally {
        setLoggingOut(false)
      }
    },
  })
  return {
    logout: () => mutation.mutateAsync().catch(() => undefined),
    isPending: mutation.isPending,
    errorMessage: mutation.error?.message ?? null,
  }
}
