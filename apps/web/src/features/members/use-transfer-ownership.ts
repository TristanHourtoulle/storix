import { useMutation, useQueryClient } from '@tanstack/react-query'
import { meQueryOptions } from '@/features/auth/session.queries'
import { userMessage } from '@/features/errors/user-message'
import { leagueDetailQueryOptions } from '@/features/leagues/leagues.queries'
import { logger } from '@/lib/logger'
import { transferOwnership } from './members.api'

/** Transfers the league ownership and refreshes the league, its members and the user's leagues. */
export function useTransferOwnership(leagueId: string): {
  transfer: (userId: string, onDone: () => void) => void
  reset: () => void
  isPending: boolean
  errorMessage: string | null
} {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (userId: string) => transferOwnership(leagueId, userId),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: leagueDetailQueryOptions(leagueId).queryKey }),
        queryClient.invalidateQueries({ queryKey: meQueryOptions.queryKey }),
      ])
    },
    onError: (error) => logger.warn('Ownership transfer failed', { leagueId, error }),
  })

  return {
    transfer: (userId, onDone) => mutation.mutate(userId, { onSuccess: onDone }),
    reset: mutation.reset,
    isPending: mutation.isPending,
    errorMessage: mutation.error ? userMessage(mutation.error) : null,
  }
}
