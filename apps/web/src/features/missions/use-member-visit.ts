import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { recordMemberVisit } from './missions.api'
import { refreshMissions } from './missions.queries'

/** Records one visit per mount of another member's page, for the "visit a member page" mission. */
export function useMemberVisit(leagueId: string, userId: string, isOtherMember: boolean): void {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!isOtherMember) return
    recordMemberVisit(leagueId, userId)
      .then(() => refreshMissions(queryClient, leagueId))
      .catch((error: unknown) => {
        logger.warn('Member visit trace failed', { error })
      })
  }, [queryClient, leagueId, userId, isOtherMember])
}
