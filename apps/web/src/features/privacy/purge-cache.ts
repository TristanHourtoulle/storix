import type { QueryClient } from '@tanstack/react-query'
import { leagueMediaPrefix, mediaCachePathPrefix } from '@storix/shared/domain'
import { logger } from '@/lib/logger'
import { API_CACHE_NAME, API_CACHE_PREFIX, MEDIA_CACHE_NAME } from '@/features/pwa/cache-names'

async function deleteMatching(
  cacheName: string,
  pathPrefixes: readonly string[],
): Promise<number | null> {
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
    return null
  }
}

/** Deletes media cache entries stored under the given storage prefixes; returns the deleted count. */
export async function purgeMediaPrefixes(prefixes: readonly string[]): Promise<number> {
  return (await deleteMatching(MEDIA_CACHE_NAME, prefixes.map(mediaCachePathPrefix))) ?? 0
}

/** Purges the media of removed cards and the league API entries; resolves false when any purge failed. */
export async function purgeRemovedCards(
  prefixes: readonly string[],
  leagueId: string,
): Promise<boolean> {
  const results = await Promise.all([
    deleteMatching(MEDIA_CACHE_NAME, prefixes.map(mediaCachePathPrefix)),
    deleteMatching(API_CACHE_NAME, [`/api/leagues/${encodeURIComponent(leagueId)}`]),
  ])
  return results.every((result) => result !== null)
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

/** Deletes every offline API cache version and the media cache; failures are logged, never thrown. */
export async function purgeAllCaches(): Promise<void> {
  if (!('caches' in window)) return
  try {
    const apiCaches = (await caches.keys()).filter((name) => name.startsWith(API_CACHE_PREFIX))
    await Promise.all([...apiCaches, MEDIA_CACHE_NAME].map((name) => caches.delete(name)))
  } catch (error) {
    logger.warn('Cache clear failed', { error })
  }
}
