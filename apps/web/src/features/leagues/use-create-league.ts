import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { CreateLeagueBody } from '@storix/shared'
import { ApiError } from '@/lib/http'
import { errorMessage } from '@/features/errors/error-messages'
import { meQueryOptions } from '@/features/auth/session.queries'
import { createLeague } from './leagues.api'

/** Creates a league, refreshes the user's leagues and opens its admin screen. */
export function useCreateLeague(): {
  create: (body: CreateLeagueBody) => void
  isPending: boolean
  errorMessage: string | null
} {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const mutation = useMutation({
    mutationFn: createLeague,
    onSuccess: async (league) => {
      await queryClient.invalidateQueries({ queryKey: meQueryOptions.queryKey })
      await navigate({ to: '/l/$leagueId/admin', params: { leagueId: league.id } })
    },
  })

  const { error } = mutation
  const message =
    error === null
      ? null
      : error instanceof ApiError
        ? errorMessage(error.code)
        : errorMessage('INTERNAL_ERROR')

  return { create: mutation.mutate, isPending: mutation.isPending, errorMessage: message }
}
