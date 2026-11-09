import { readStorage, removeStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage'

export type CameraPermissionState = 'granted' | 'denied' | 'prompt' | 'unknown'

/** The Permissions API state for the camera, or 'unknown' when the browser cannot tell. */
export async function queryCameraPermission(): Promise<CameraPermissionState> {
  try {
    if (typeof navigator.permissions?.query !== 'function') return 'unknown'
    const status = await navigator.permissions.query({ name: 'camera' })
    return status.state
  } catch {
    return 'unknown'
  }
}

/** True when this device already granted the camera to Storix once. */
export function hasGrantedBefore(): boolean {
  return readStorage(STORAGE_KEYS.cameraGranted) !== null
}

/** Remembers that the camera was granted. */
export function rememberGranted(): void {
  writeStorage(STORAGE_KEYS.cameraGranted, '1')
}

/** Forgets the camera grant after a denial. */
export function forgetGranted(): void {
  removeStorage(STORAGE_KEYS.cameraGranted)
}
