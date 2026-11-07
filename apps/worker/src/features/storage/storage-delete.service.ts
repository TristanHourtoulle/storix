import type { ObjectStorage } from '@storix/storage'
import type { WorkerLogger } from '../../lib/logger'

export interface StorageDeleteService {
  deleteObjects(keys: readonly string[]): Promise<void>
}

interface Deps {
  storage: ObjectStorage
  logger: WorkerLogger
}

/** Creates the use case deleting stored objects, failing loudly so the job is retried. */
export function createStorageDeleteService(deps: Deps): StorageDeleteService {
  const { storage, logger } = deps
  return {
    async deleteObjects(keys) {
      await storage.delete(keys)
      logger.info({ count: keys.length }, 'Deleted stored objects')
    },
  }
}
