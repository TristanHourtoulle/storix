import type { QueryClient } from '@tanstack/react-query'
import { leagueMediaPrefix, mediaCachePathPrefix } from '@storix/shared/domain'
import { logger } from '@/lib/logger'
import { API_CACHE_NAME, MEDIA_CACHE_NAME } from '@/features/pwa/cache-names'

async function deleteMatching(cacheName: string, pathPrefixes: readonly string[]): Promise<number> {
  if (pathPrefixes.length === 0 || !('caches' in window)) return 0
  try {
    const cache = await caches.open(cacheName)
    const requests = await cache.keys()
    const matching = requests.filter((request) => {
      const { pathname } = new URL(request.url)
      return pathPrefixes.some((prefix) => pathname.startsWith(prefix))
    })
    const results = await Promise.all(matching.map((request) => cache.delete(request)))
    return results.filter(Boolean).length
  } catch (error) {
    logger.warn('Cache purge failed', { cacheName, error })
    return 0
  }
}

/** Deletes media cache entries stored under the given storage prefixes; returns the deleted count. */
export function purgeMediaPrefixes(prefixes: readonly string[]): Promise<number> {
  return deleteMatching(MEDIA_CACHE_NAME, prefixes.map(mediaCachePathPrefix))
}

/** Deletes the offline API cache entries of one league. */
export async function purgeLeagueApiEntries(leagueId: string): Promise<void> {
  await deleteMatching(API_CACHE_NAME, [`/api/leagues/${encodeURIComponent(leagueId)}`])
}

/** Drops every cached trace of a league the user can no longer access. */
export async function purgeLeagueCaches(queryClient: QueryClient, leagueId: string): Promise<void> {
  queryClient.removeQueries({ queryKey: ['leagues', leagueId] })
  await Promise.all([
    purgeMediaPrefixes([leagueMediaPrefix(leagueId)]),
    purgeLeagueApiEntries(leagueId),
  ])
}

/** Deletes the per-user offline API cache and the media cache; failures are logged, never thrown. */
export async function purgeAllCaches(): Promise<void> {
  if (!('caches' in window)) return
  try {
    await Promise.all([caches.delete(API_CACHE_NAME), caches.delete(MEDIA_CACHE_NAME)])
  } catch (error) {
    logger.warn('Cache clear failed', { error })
  }
}
