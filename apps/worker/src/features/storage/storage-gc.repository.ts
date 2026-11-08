import { inArray, lt } from 'drizzle-orm'
import { cardRemovals, listLivePortraitPrefixes, media, uploads, type DbExecutor } from '@storix/db'
import { mediaPrefix } from '@storix/shared'

const LIVE_UPLOAD_STATUSES = ['pending', 'uploaded', 'processing', 'staged', 'publishing'] as const

/** Returns the storage prefix of every media row, of every portrait row and of every portrait upload being rendered. */
export async function listLiveMediaPrefixes(db: DbExecutor): Promise<Set<string>> {
  const rows = await db
    .select({ leagueId: media.leagueId, sourceSha256: media.sourceSha256 })
    .from(media)
  const portraitPrefixes = await listLivePortraitPrefixes(db)
  return new Set([...rows.map((row) => mediaPrefix(row)), ...portraitPrefixes])
}

/** Returns the object keys of uploads still waiting for or undergoing processing. */
export async function listLiveIncomingKeys(db: DbExecutor): Promise<Set<string>> {
  const rows = await db
    .select({ objectKey: uploads.objectKey })
    .from(uploads)
    .where(inArray(uploads.status, [...LIVE_UPLOAD_STATUSES]))
  return new Set(rows.map((row) => row.objectKey))
}

/** Deletes card removal tombstones older than the given date and returns how many were purged. */
export async function deleteTombstonesBefore(db: DbExecutor, before: Date): Promise<number> {
  const deleted = await db
    .delete(cardRemovals)
    .where(lt(cardRemovals.removedAt, before))
    .returning({ cardId: cardRemovals.cardId })
  return deleted.length
}
