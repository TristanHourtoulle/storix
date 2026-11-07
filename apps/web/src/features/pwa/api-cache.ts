import { logger } from '@/lib/logger'
import { API_CACHE_NAME } from './cache-names'

/** Deletes the per-user offline API cache; failures are logged, never thrown. */
export async function clearApiCache(): Promise<void> {
  if (!('caches' in window)) return
  try {
    await caches.delete(API_CACHE_NAME)
  } catch (error) {
    logger.warn('API cache clear failed', { error })
  }
}
