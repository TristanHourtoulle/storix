import type { Database } from '@storix/db'
import {
  classifyOrphans,
  evaluateGcSafety,
  MEDIA_OBJECT_KEY_PATTERN,
  mediaPrefixOfKey,
  type StoredObject,
} from '@storix/shared'
import type { ObjectStorage } from '@storix/storage'
import type { WorkerLogger } from '../../lib/logger'
import * as repository from './storage-gc.repository'

const DAY_MS = 86_400_000
const TOMBSTONE_RETENTION_MS = 35 * DAY_MS
const DELETE_CHUNK_SIZE = 500
const MAX_IMG_ORPHAN_RATIO = 0.25
const MAX_IMG_ORPHAN_COUNT = 20
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
      const scanned = images.length + incoming.length

      const verdict = evaluateGcSafety({
        liveMediaPrefixCount: liveMediaPrefixes.size,
        imagesScanned: images.length,
        imageCandidates: orphans.filter((key) => key.startsWith(IMG_PREFIX)).length,
        maxOrphanRatio: MAX_IMG_ORPHAN_RATIO,
        maxOrphanCount: MAX_IMG_ORPHAN_COUNT,
      })
      if (!verdict.safe) {
        logger.error(
          { reason: verdict.reason, scanned, candidates: orphans.length },
          'Storage GC aborted: refusing to delete',
        )
        return { scanned, deleted: 0, tombstones: 0 }
      }

      let deleted = 0
      let dropped = 0
      for (let start = 0; start < orphans.length; start += DELETE_CHUNK_SIZE) {
        const chunk = orphans.slice(start, start + DELETE_CHUNK_SIZE)
        const freshMediaPrefixes = await repository.listLiveMediaPrefixes(db)
        const freshIncomingKeys = await repository.listLiveIncomingKeys(db)
        const safeKeys = chunk.filter(
          (key) => !freshMediaPrefixes.has(mediaPrefixOfKey(key)) && !freshIncomingKeys.has(key),
        )
        dropped += chunk.length - safeKeys.length
        if (safeKeys.length === 0) continue
        await storage.delete(safeKeys)
        deleted += safeKeys.length
      }
      if (dropped > 0) logger.warn({ dropped }, 'Dropped candidates that became live')
      const tombstones = await repository.deleteTombstonesBefore(
        db,
        new Date(now.getTime() - TOMBSTONE_RETENTION_MS),
      )
      const result = { scanned, deleted, tombstones }
      logger.info(result, 'Storage GC done')
      return result
    },
  }
}
