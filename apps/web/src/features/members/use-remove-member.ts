import { useMutation, useQueryClient } from '@tanstack/react-query'
import { userMessage } from '@/features/errors/user-message'
import { leagueDetailQueryOptions } from '@/features/leagues/leagues.queries'
import { removeMember } from './members.api'
import { membersQueryOptions } from './members.queries'

/** Removes a member and refreshes the member list and league detail. */
export function useRemoveMember(leagueId: string): {
  remove: (userId: string, onDone: () => void) => void
  reset: () => void
  isPending: boolean
  errorMessage: string | null
} {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (userId: string) => removeMember(leagueId, userId),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: membersQueryOptions(leagueId).queryKey }),
        queryClient.invalidateQueries({ queryKey: leagueDetailQueryOptions(leagueId).queryKey }),
      ])
    },
  })

  return {
    remove: (userId, onDone) => mutation.mutate(userId, { onSuccess: onDone }),
    reset: mutation.reset,
    isPending: mutation.isPending,
    errorMessage: mutation.error ? userMessage(mutation.error) : null,
  }
}
