import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { PhotosChoice } from '@storix/shared'
import { meQueryOptions } from '@/features/auth/session.queries'
import { userMessage } from '@/features/errors/user-message'
import { clearLastLeagueId } from '@/features/leagues/last-league'
import { purgeLeagueCaches } from '@/features/privacy/purge-cache'
import { logger } from '@/lib/logger'
import { removeLeagueStorage } from '@/lib/storage'
import { leaveLeague } from './members.api'

/** Leaves a league, drops every cached trace of it and returns to the home screen. */
export function useLeaveLeague(
  userId: string,
  leagueId: string,
): {
  leave: (photos: PhotosChoice) => void
  reset: () => void
  isPending: boolean
  errorMessage: string | null
} {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const mutation = useMutation({
    meta: { sound: 'error-only' },
    mutationFn: async (photos: PhotosChoice): Promise<void> => {
      await leaveLeague(leagueId, photos)
      clearLastLeagueId(userId)
      removeLeagueStorage(userId, leagueId)
      await queryClient.invalidateQueries({ queryKey: meQueryOptions.queryKey })
      await navigate({ to: '/', replace: true })
      await purgeLeagueCaches(queryClient, leagueId)
    },
    onError: (error) => logger.warn('Leaving the league failed', { leagueId, error }),
  })

  return {
    leave: (photos) => mutation.mutate(photos),
    reset: mutation.reset,
    isPending: mutation.isPending,
    errorMessage: mutation.error ? userMessage(mutation.error) : null,
  }
}
