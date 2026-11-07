import { STORAGE_KEYS, readStorage, writeStorage } from '@/lib/storage'

export type MotionPermission = 'granted' | 'denied' | 'prompt' | 'unsupported'

interface PermissionRequester {
  requestPermission: () => Promise<'granted' | 'denied'>
}

/** Returns the iOS 13+ orientation permission API, or null where orientation needs no permission. */
export function getPermissionRequester(): PermissionRequester | null {
  if (typeof DeviceOrientationEvent === 'undefined') return null
  if (
    'requestPermission' in DeviceOrientationEvent &&
    typeof DeviceOrientationEvent.requestPermission === 'function'
  ) {
    return DeviceOrientationEvent as unknown as PermissionRequester
  }
  return null
}

/** Initial permission state from the last remembered answer on this device. */
export function readMotionPermission(): MotionPermission {
  if (!getPermissionRequester()) return 'unsupported'
  const stored = readStorage(STORAGE_KEYS.motionPermission)
  return stored === 'granted' || stored === 'denied' ? stored : 'prompt'
}

/** Remembers the last permission answer so the next card detail starts in the right state. */
export function rememberMotionPermission(permission: 'granted' | 'denied'): void {
  writeStorage(STORAGE_KEYS.motionPermission, permission)
}
