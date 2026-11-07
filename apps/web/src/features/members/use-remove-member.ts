import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { PhotosChoice } from '@storix/shared'
import { userMessage } from '@/features/errors/user-message'
import { leagueDetailQueryOptions } from '@/features/leagues/leagues.queries'
import { removeMember } from './members.api'
import { membersQueryOptions } from './members.queries'

interface RemoveMemberVariables {
  userId: string
  photos: PhotosChoice
}

/** Removes a member and refreshes the member list and league detail. */
export function useRemoveMember(leagueId: string): {
  remove: (variables: RemoveMemberVariables, onDone: () => void) => void
  reset: () => void
  isPending: boolean
  errorMessage: string | null
} {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ userId, photos }: RemoveMemberVariables) =>
      removeMember(leagueId, userId, photos),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: membersQueryOptions(leagueId).queryKey }),
        queryClient.invalidateQueries({ queryKey: leagueDetailQueryOptions(leagueId).queryKey }),
      ])
    },
  })

  return {
    remove: (variables, onDone) => mutation.mutate(variables, { onSuccess: onDone }),
    reset: mutation.reset,
    isPending: mutation.isPending,
    errorMessage: mutation.error ? userMessage(mutation.error) : null,
  }
}
