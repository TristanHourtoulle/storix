import { logger } from '@/lib/logger'

function key(leagueId: string, day: string): string {
  return `storix.momentDismissed.${leagueId}.${day}`
}

/** Tells whether the member closed the full-screen flash of this Moment ("Plus tard"). */
export function isFlashDismissed(leagueId: string, day: string): boolean {
  try {
    return window.localStorage.getItem(key(leagueId, day)) === '1'
  } catch (error) {
    logger.warn('Moment dismissal could not be read', { error })
    return false
  }
}

/** Remembers that the member closed the flash of this Moment. */
export function dismissFlash(leagueId: string, day: string): void {
  try {
    window.localStorage.setItem(key(leagueId, day), '1')
  } catch (error) {
    logger.warn('Moment dismissal could not be saved', { error })
  }
}
