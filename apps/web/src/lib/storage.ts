import { logger } from './logger'

export const STORAGE_KEYS = {
  lastLeagueId: 'storix.lastLeagueId',
  iosHintDismissed: 'storix.iosHintDismissed',
  passkeyPromptDismissed: (userId: string): string => `storix.passkeyPromptDismissed.${userId}`,
} as const

/** Reads a localStorage value, returning null when missing or unavailable. */
export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch (error) {
    logger.warn('Storage read failed', { key, error })
    return null
  }
}

/** Writes a localStorage value, logging instead of throwing on failure. */
export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch (error) {
    logger.warn('Storage write failed', { key, error })
  }
}
