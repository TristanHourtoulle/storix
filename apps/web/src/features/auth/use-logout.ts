import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'

/** Signs out, clears every cached query and returns to the login screen. */
export function useLogout(): { logout: () => Promise<void>; isPending: boolean } {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const mutation = useMutation({
    mutationFn: async (): Promise<void> => {
      await authClient.signOut()
      queryClient.clear()
      await navigate({ to: '/login', replace: true })
    },
  })
  return { logout: mutation.mutateAsync, isPending: mutation.isPending }
}
