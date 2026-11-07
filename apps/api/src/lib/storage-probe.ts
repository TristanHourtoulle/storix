import type { ObjectStorage } from '@storix/storage'

const PROBE_KEY = 'health/storage-probe'

/** Fails loudly when the bucket is missing or the credentials are rejected. */
export async function assertStorageReachable(storage: ObjectStorage): Promise<void> {
  try {
    const object = await storage.getStream(PROBE_KEY)
    object?.body.destroy()
  } catch (error) {
    throw new Error('Object storage bucket is unreachable', { cause: error })
  }
}
