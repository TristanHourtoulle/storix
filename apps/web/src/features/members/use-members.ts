import { useSuspenseQuery } from '@tanstack/react-query'
import type { MemberSummary } from '@storix/shared'
import { membersQueryOptions } from './members.queries'

/** Members of a league; suspends until loaded. */
export function useMembers(leagueId: string): MemberSummary[] {
  const { data } = useSuspenseQuery(membersQueryOptions(leagueId))
  return data
}
