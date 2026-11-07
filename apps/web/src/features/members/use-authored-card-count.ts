import { useQuery } from '@tanstack/react-query'
import { membersQueryOptions } from './members.queries'

/** Number of cards the user authored in the league, or null while the member list is unknown. */
export function useAuthoredCardCount(leagueId: string, userId: string): number | null {
  const { data } = useQuery({
    ...membersQueryOptions(leagueId),
    select: (members) => members.find((member) => member.userId === userId)?.authoredCardCount,
  })
  return data ?? null
}
