import { logger } from './logger'

export const STORAGE_KEYS = {
  lastLeagueId: (userId: string): string => `storix.lastLeagueId.${userId}`,
  removalCursor: (userId: string, leagueId: string): string =>
    `storix.removalCursor.${userId}.${leagueId}`,
  pendingRemovals: (userId: string, leagueId: string): string =>
    `storix.pendingRemovals.${userId}.${leagueId}`,
  acknowledgedRemovals: (userId: string, leagueId: string): string =>
    `storix.acknowledgedRemovals.${userId}.${leagueId}`,
  iosHintDismissed: 'storix.iosHintDismissed',
  motionPermission: 'storix.motionPermission',
  cameraGranted: 'storix.cameraGranted',
  soundSettings: 'storix.soundSettings',
  pushPromptDismissed: 'storix.pushPromptDismissed',
  pushSavedDevice: 'storix.pushSavedDevice',
  shareStyle: 'storix.shareStyle',
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

/** Removes a localStorage value, logging instead of throwing on failure. */
export function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch (error) {
    logger.warn('Storage remove failed', { key, error })
  }
}

function listStorageKeys(): string[] {
  try {
    return Array.from({ length: window.localStorage.length }, (_, index) =>
      window.localStorage.key(index),
    ).filter((key): key is string => key !== null)
  } catch (error) {
    logger.warn('Storage listing failed', { error })
    return []
  }
}

/** Removes the per-league keys a user stored for one league. */
export function removeLeagueStorage(userId: string, leagueId: string): void {
  removeStorage(STORAGE_KEYS.removalCursor(userId, leagueId))
  removeStorage(STORAGE_KEYS.pendingRemovals(userId, leagueId))
  removeStorage(STORAGE_KEYS.acknowledgedRemovals(userId, leagueId))
}

/** Removes every key stored for a user on this device. */
export function removeUserStorage(userId: string): void {
  const exactKeys = new Set([
    STORAGE_KEYS.lastLeagueId(userId),
    STORAGE_KEYS.passkeyPromptDismissed(userId),
  ])
  const prefixes = [
    STORAGE_KEYS.removalCursor(userId, ''),
    STORAGE_KEYS.pendingRemovals(userId, ''),
    STORAGE_KEYS.acknowledgedRemovals(userId, ''),
  ]
  listStorageKeys()
    .filter((key) => exactKeys.has(key) || prefixes.some((prefix) => key.startsWith(prefix)))
    .forEach(removeStorage)
}
