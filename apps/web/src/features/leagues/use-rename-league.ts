import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { LeagueDetail, MeResponse, RenameLeagueBody } from '@storix/shared'
import { meQueryOptions } from '@/features/auth/session.queries'
import { userMessage } from '@/features/errors/user-message'
import { renameLeague } from './leagues.api'
import { leagueDetailQueryOptions } from './leagues.queries'

function withLeagueName(me: MeResponse | null | undefined, league: LeagueDetail) {
  if (!me) return me
  return {
    ...me,
    leagues: me.leagues.map((summary) =>
      summary.id === league.id ? { ...summary, name: league.name } : summary,
    ),
  }
}

/** Renames the league and propagates the new name to the detail and `me` caches. */
export function useRenameLeague(leagueId: string): {
  rename: (body: RenameLeagueBody) => void
  reset: () => void
  isPending: boolean
  isSuccess: boolean
  errorMessage: string | null
} {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (body: RenameLeagueBody) => renameLeague(leagueId, body),
    onSuccess: (league) => {
      queryClient.setQueryData(leagueDetailQueryOptions(league.id).queryKey, league)
      queryClient.setQueryData(meQueryOptions.queryKey, (me: MeResponse | null | undefined) =>
        withLeagueName(me, league),
      )
    },
  })

  return {
    rename: mutation.mutate,
    reset: mutation.reset,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    errorMessage: mutation.error ? userMessage(mutation.error) : null,
  }
}
