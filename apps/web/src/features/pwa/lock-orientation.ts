import { logger } from '@/lib/logger'
import { isIos, isStandalone } from '@/lib/platform'

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: 'portrait') => Promise<void>
}

/** Best-effort portrait lock for installed apps on Android; iOS and unsupported browsers are skipped. */
export async function lockPortraitOrientation(): Promise<void> {
  if (isIos() || !isStandalone() || typeof screen.orientation === 'undefined') return
  const orientation: LockableOrientation = screen.orientation
  if (typeof orientation.lock !== 'function') return
  try {
    await orientation.lock('portrait')
  } catch (error) {
    logger.debug('Portrait lock unavailable', { error })
  }
}
