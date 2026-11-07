import type { Database } from '@storix/db'
import { classifyOrphans, MEDIA_OBJECT_KEY_PATTERN, type StoredObject } from '@storix/shared'
import type { ObjectStorage } from '@storix/storage'
import type { WorkerLogger } from '../../lib/logger'
import * as repository from './storage-gc.repository'

const DAY_MS = 86_400_000
const TOMBSTONE_RETENTION_MS = 35 * DAY_MS
const DELETE_CHUNK_SIZE = 500
const IMG_PREFIX = 'img/'
const INCOMING_PREFIX = 'incoming/'

export interface StorageGcResult {
  scanned: number
  deleted: number
  tombstones: number
}

export interface StorageGcService {
  collect(): Promise<StorageGcResult>
}

interface Deps {
  db: Database
  storage: ObjectStorage
  clock: () => Date
  logger: WorkerLogger
}

async function listAll(storage: ObjectStorage, prefix: string): Promise<StoredObject[]> {
  const objects: StoredObject[] = []
  for await (const object of storage.list(prefix)) objects.push(object)
  return objects
}

/** Creates the use case removing bucket objects no database row references. */
export function createStorageGcService(deps: Deps): StorageGcService {
  const { db, storage, clock, logger } = deps

  return {
    async collect() {
      const now = clock()
      const liveMediaPrefixes = await repository.listLiveMediaPrefixes(db)
      const liveIncomingKeys = await repository.listLiveIncomingKeys(db)
      const images = await listAll(storage, IMG_PREFIX)
      const incoming = await listAll(storage, INCOMING_PREFIX)

      const wellFormedImages = images.filter(({ key }) => MEDIA_OBJECT_KEY_PATTERN.test(key))
      const malformed = images.length - wellFormedImages.length
      if (malformed > 0) logger.warn({ malformed }, 'Skipped malformed image keys')

      const objects = [...wellFormedImages, ...incoming]
      const orphans = classifyOrphans({ objects, liveMediaPrefixes, liveIncomingKeys, now })
      for (let start = 0; start < orphans.length; start += DELETE_CHUNK_SIZE) {
        await storage.delete(orphans.slice(start, start + DELETE_CHUNK_SIZE))
      }
      const tombstones = await repository.deleteTombstonesBefore(
        db,
        new Date(now.getTime() - TOMBSTONE_RETENTION_MS),
      )
      const result = {
        scanned: images.length + incoming.length,
        deleted: orphans.length,
        tombstones,
      }
      logger.info(result, 'Storage GC done')
      return result
    },
  }
}
