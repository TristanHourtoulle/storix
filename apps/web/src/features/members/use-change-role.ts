import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UpdateMemberRoleBody } from '@storix/shared'
import { userMessage } from '@/features/errors/user-message'
import { updateMemberRole } from './members.api'
import { membersQueryOptions } from './members.queries'

interface ChangeRoleVariables {
  userId: string
  role: UpdateMemberRoleBody['role']
}

/** Changes a member's role and refreshes the member list. */
export function useChangeRole(leagueId: string): {
  changeRole: (variables: ChangeRoleVariables) => void
  isPending: boolean
  errorMessage: string | null
} {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ userId, role }: ChangeRoleVariables) =>
      updateMemberRole(leagueId, userId, { role }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: membersQueryOptions(leagueId).queryKey }),
  })

  return {
    changeRole: mutation.mutate,
    isPending: mutation.isPending,
    errorMessage: mutation.error ? userMessage(mutation.error) : null,
  }
}
