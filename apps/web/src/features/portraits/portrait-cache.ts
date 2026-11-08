import type { QueryClient } from '@tanstack/react-query'
import type { Portrait } from '@storix/shared'
import {
  portraitPrefixOfMediaUrl,
  stalePortraitCachePaths,
  type PortraitCacheOwner,
} from '@storix/shared/domain'
import { meQueryOptions } from '@/features/auth/session.queries'
import { MEDIA_CACHE_NAME } from '@/features/pwa/cache-names'
import { purgeMediaPrefixes } from '@/features/privacy/purge-cache'
import { logger } from '@/lib/logger'
import type { PortraitTarget } from './portrait-target'

/** Refetches every view that shows the target's portrait. */
export async function refreshPortraitViews(
  queryClient: QueryClient,
  target: PortraitTarget,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: meQueryOptions.queryKey }),
    queryClient.invalidateQueries({
      queryKey: target.kind === 'avatar' ? ['leagues'] : ['leagues', target.leagueId],
    }),
  ])
}

/** Drops the cached images of the replaced portrait and refetches every view that shows it. */
export async function onPortraitChanged(
  queryClient: QueryClient,
  target: PortraitTarget,
  previous: Portrait | null,
): Promise<void> {
  const previousPrefix = previous ? portraitPrefixOfMediaUrl(previous.url) : null
  await Promise.all([
    previousPrefix ? purgeMediaPrefixes([previousPrefix]) : Promise.resolve(0),
    refreshPortraitViews(queryClient, target),
  ])
}

/** Deletes cached portrait images of known owners that are no longer current; logs failures, never throws. */
export async function prunePortraitCache(owners: readonly PortraitCacheOwner[]): Promise<number> {
  if (owners.length === 0 || !('caches' in window)) return 0
  try {
    const cache = await caches.open(MEDIA_CACHE_NAME)
    const requests = await cache.keys()
    const stale = new Set(
      stalePortraitCachePaths(
        requests.map((request) => new URL(request.url).pathname),
        owners,
      ),
    )
    const matching = requests.filter((request) => stale.has(new URL(request.url).pathname))
    const results = await Promise.all(matching.map((request) => cache.delete(request)))
    const deleted = results.filter(Boolean).length
    if (deleted > 0) logger.info('Stale portraits pruned', { deleted })
    return deleted
  } catch (error) {
    logger.warn('Portrait cache prune failed', { error })
    return 0
  }
}
