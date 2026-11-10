import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EmblemId, UnseenEmblems } from '@storix/shared'
import { logger } from '@/lib/logger'
import { markEmblemsSeen } from './emblems.api'
import { unseenEmblemsQueryOptions } from './emblems.queries'

const NO_UNSEEN: UnseenEmblems['emblems'] = []

/** The viewer's emblems waiting for their unlock banner, and the action marking them announced. */
export function useUnseenEmblems(leagueId: string) {
  const queryClient = useQueryClient()
  const options = unseenEmblemsQueryOptions(leagueId)
  const query = useQuery(options)
  const markSeen = useMutation({
    mutationFn: (emblemIds: readonly EmblemId[]) => markEmblemsSeen(leagueId, emblemIds),
    onMutate: (emblemIds) => {
      const seen = new Set(emblemIds)
      queryClient.setQueryData<UnseenEmblems>(options.queryKey, (data) =>
        data ? { emblems: data.emblems.filter((emblem) => !seen.has(emblem.id)) } : data,
      )
    },
    onError: (error) => {
      logger.warn('Marking emblems seen failed', { error })
      void queryClient.invalidateQueries({ queryKey: options.queryKey })
    },
  })
  return { unseen: query.data?.emblems ?? NO_UNSEEN, markSeen: markSeen.mutate }
}
