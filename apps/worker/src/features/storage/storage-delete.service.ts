import type { Database } from '@storix/db'
import { mediaPrefixOfKey } from '@storix/shared'
import type { ObjectStorage } from '@storix/storage'
import type { WorkerLogger } from '../../lib/logger'
import * as repository from './storage-gc.repository'

export interface StorageDeleteService {
  deleteObjects(keys: readonly string[]): Promise<void>
}

interface Deps {
  db: Database
  storage: ObjectStorage
  logger: WorkerLogger
}

const IMG_PREFIX = 'img/'

/** Creates the use case deleting stored objects that no database row references, failing loudly so the job is retried. */
export function createStorageDeleteService(deps: Deps): StorageDeleteService {
  const { db, storage, logger } = deps
  return {
    async deleteObjects(keys) {
      const liveMediaPrefixes = await repository.listLiveMediaPrefixes(db)
      const liveIncomingKeys = await repository.listLiveIncomingKeys(db)
      const deletable = keys.filter((key) =>
        key.startsWith(IMG_PREFIX)
          ? !liveMediaPrefixes.has(mediaPrefixOfKey(key))
          : !liveIncomingKeys.has(key),
      )
      const refused = keys.length - deletable.length
      if (refused > 0) logger.error({ refused }, 'Refused to delete keys that are still live')
      if (deletable.length === 0) return
      await storage.delete(deletable)
      logger.info({ count: deletable.length }, 'Deleted stored objects')
    },
  }
}
