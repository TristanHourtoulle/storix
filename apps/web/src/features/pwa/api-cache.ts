import { logger } from '@/lib/logger'
import { API_CACHE_NAME, MEDIA_CACHE_NAME } from './cache-names'

/** Deletes the per-user offline API cache and the media cache; failures are logged, never thrown. */
export async function clearApiCache(): Promise<void> {
  if (!('caches' in window)) return
  try {
    await Promise.all([caches.delete(API_CACHE_NAME), caches.delete(MEDIA_CACHE_NAME)])
  } catch (error) {
    logger.warn('API cache clear failed', { error })
  }
}
