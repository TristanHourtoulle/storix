import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { markFeedSeen } from './league-feed.api'
import { feedQueryKey } from './league-feed.queries'

/**
 * Records the viewer's visit to the feed when they leave Home or hide the app, once per visit.
 * The rows already on screen keep their "new" separator; the next visit refetches without it.
 */
export function useFeedSeen(leagueId: string): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    let isRecorded = false
    const record = () => {
      if (isRecorded) return
      isRecorded = true
      void queryClient.invalidateQueries({ queryKey: feedQueryKey(leagueId), refetchType: 'none' })
      markFeedSeen(leagueId).catch((error: unknown) => {
        logger.warn('Marking the feed seen failed', { error })
      })
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') record()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      record()
    }
  }, [queryClient, leagueId])
}
