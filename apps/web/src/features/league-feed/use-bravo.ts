import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import type { FeedBravo, FeedHighlights, FeedPage } from '@storix/shared'
import { logger } from '@/lib/logger'
import { sendBravo } from './league-feed.api'
import { feedQueryKey } from './league-feed.queries'

type FeedCache = FeedPage | InfiniteData<FeedPage> | FeedHighlights

function patchPage(page: FeedPage, eventId: string, bravo: FeedBravo): FeedPage {
  return {
    ...page,
    rows: page.rows.map((row) => (row.id === eventId ? { ...row, ...bravo } : row)),
  }
}

function patchCache(cache: FeedCache, eventId: string, bravo: FeedBravo): FeedCache {
  if ('highlights' in cache) {
    return {
      highlights: cache.highlights.map((highlight) =>
        highlight.eventId === eventId ? { ...highlight, ...bravo } : highlight,
      ),
    }
  }
  if ('pages' in cache) {
    return { ...cache, pages: cache.pages.map((page) => patchPage(page, eventId, bravo)) }
  }
  return patchPage(cache, eventId, bravo)
}

/** Sends the viewer's single Bravo on a promotion, updating every cached feed row at once. */
export function useBravo(leagueId: string) {
  const queryClient = useQueryClient()
  const key = feedQueryKey(leagueId)

  function apply(eventId: string, bravo: FeedBravo): void {
    queryClient.setQueriesData<FeedCache>({ queryKey: key }, (cache) =>
      cache === undefined ? cache : patchCache(cache, eventId, bravo),
    )
  }

  const mutation = useMutation({
    mutationFn: (input: { eventId: string; bravoCount: number }) =>
      sendBravo(leagueId, input.eventId),
    onMutate: ({ eventId, bravoCount }) => {
      apply(eventId, { bravoCount: bravoCount + 1, hasBravoed: true })
    },
    onSuccess: (bravo, { eventId }) => apply(eventId, bravo),
    onError: (error) => {
      logger.warn('Bravo failed', { error })
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })

  return {
    sendBravo: (eventId: string, bravoCount: number) => mutation.mutate({ eventId, bravoCount }),
    isPending: mutation.isPending,
  }
}
