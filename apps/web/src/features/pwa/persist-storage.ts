import { logger } from '@/lib/logger'

let requested = false

/** Asks the browser once to keep Storix data from being evicted. */
export async function requestPersistentStorage(): Promise<void> {
  if (requested || !('storage' in navigator) || !navigator.storage.persist) return
  requested = true
  try {
    if (await navigator.storage.persisted()) return
    const granted = await navigator.storage.persist()
    logger.info('Persistent storage requested', { granted })
  } catch (error) {
    logger.warn('Persistent storage request failed', { error })
  }
}
