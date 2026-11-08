import type { Database } from '@storix/db'
import {
  filterDeletableKeys,
  mediaPrefixOfKey,
  spareFreshObjects,
  type StoredObject,
} from '@storix/shared'
import type { ObjectStorage } from '@storix/storage'
import type { WorkerLogger } from '../../lib/logger'
import * as repository from './storage-gc.repository'

export interface StorageDeleteService {
  deleteObjects(keys: readonly string[], input: { requestedAt: Date }): Promise<void>
}

interface Deps {
  db: Database
  storage: ObjectStorage
  logger: WorkerLogger
}

const AGE_CHECKED_PREFIX = 'img/'

async function listObjects(storage: ObjectStorage, prefix: string): Promise<StoredObject[]> {
  const objects: StoredObject[] = []
  for await (const object of storage.list(prefix)) objects.push(object)
  return objects
}

/**
 * Creates the use case deleting stored objects that no database row references, failing loudly so the job is retried.
 * `img/` keys written after `requestedAt` (minus a margin) are spared for the GC, since a re-picked photo re-writes them.
 */
export function createStorageDeleteService(deps: Deps): StorageDeleteService {
  const { db, storage, logger } = deps
  return {
    async deleteObjects(keys, { requestedAt }) {
      const liveMediaPrefixes = await repository.listLiveMediaPrefixes(db)
      const liveIncomingKeys = await repository.listLiveIncomingKeys(db)
      const { deletable: unreferenced, refused } = filterDeletableKeys({
        keys,
        liveMediaPrefixes,
        liveIncomingKeys,
      })
      const ageChecked = unreferenced.filter((key) => key.startsWith(AGE_CHECKED_PREFIX))
      const prefixes = [...new Set(ageChecked.map(mediaPrefixOfKey))]
      const listings = await Promise.all(prefixes.map((prefix) => listObjects(storage, prefix)))
      const aged = spareFreshObjects({ keys: ageChecked, objects: listings.flat(), requestedAt })
      const deletable = unreferenced.filter(
        (key) => !key.startsWith(AGE_CHECKED_PREFIX) || aged.deletable.includes(key),
      )
      if (refused.length > 0)
        logger.error({ refused: refused.length }, 'Refused to delete keys that are still live')
      if (aged.spared.length > 0)
        logger.warn(
          { spared: aged.spared.length },
          'Spared objects written after the delete request',
        )
      if (aged.missing.length > 0)
        logger.info({ missing: aged.missing.length }, 'Skipped keys with no stored object')
      if (deletable.length === 0) return
      await storage.delete(deletable)
      logger.info({ count: deletable.length }, 'Deleted stored objects')
    },
  }
}
