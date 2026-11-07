import { useMutation } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { authErrorMessage } from './auth-errors'

interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

/** Changes the password and revokes the user's other sessions. */
export function useChangePassword(): {
  changePassword: (input: ChangePasswordInput) => Promise<void>
  isPending: boolean
} {
  const mutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: ChangePasswordInput): Promise<void> => {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      })
      if (error) throw new Error(authErrorMessage(error, 'Impossible de modifier le mot de passe.'))
    },
  })
  return { changePassword: mutation.mutateAsync, isPending: mutation.isPending }
}
