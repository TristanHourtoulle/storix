import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FeedHighlights } from '@storix/shared'
import { logger } from '@/lib/logger'
import { markHighlightsSeen } from './league-feed.api'
import { feedHighlightsQueryOptions } from './league-feed.queries'

const NO_HIGHLIGHTS: FeedHighlights = { highlights: [] }

/** Friends' Mythic ★ promotions not yet announced, with actions to record and dismiss them. */
export function useMythicHighlights(leagueId: string) {
  const queryClient = useQueryClient()
  const { data } = useQuery(feedHighlightsQueryOptions(leagueId))
  const { mutate: markSeen } = useMutation({
    mutationFn: () => markHighlightsSeen(leagueId),
    onError: (error) => {
      logger.warn('Marking highlights seen failed', { error })
    },
  })
  const clear = useCallback(() => {
    queryClient.setQueryData(feedHighlightsQueryOptions(leagueId).queryKey, NO_HIGHLIGHTS)
  }, [queryClient, leagueId])
  return { highlights: data?.highlights ?? NO_HIGHLIGHTS.highlights, markSeen, clear }
}
