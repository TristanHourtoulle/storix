/**
 * Owner-row queries on `portraits`, shared by the api and the worker.
 * Lock order (R8), every lock held until the transaction ends:
 * - avatar processing: upload row, then `user` row, then `portraits`;
 * - league photo processing: member row (`FOR SHARE`, read the role), then upload row, then `leagues` row, then `portraits`;
 * - api removal: owner row (`user` or `leagues`), then `portraits`.
 * @module
 */
import { and, eq, inArray, isNotNull, ne } from 'drizzle-orm'
import {
  portraitPrefix,
  selfiePrefix,
  storedPortraitKeys,
  type PortraitKind,
  type PortraitOwner,
} from '@storix/shared/domain'
import type { DbExecutor } from '../client'
import { cards, momentPosts, portraits, uploads } from '../schema/index'

export interface StoredPortrait {
  id: string
  uploadId: string
  kind: PortraitKind
  ownerId: string
  dominantColor: string
}

const RENDERING_UPLOAD_STATUSES = ['uploaded', 'processing'] as const

const portraitColumns = {
  id: portraits.id,
  uploadId: portraits.uploadId,
  kind: portraits.kind,
  userId: portraits.userId,
  leagueId: portraits.leagueId,
  dominantColor: portraits.dominantColor,
}

interface PortraitRow {
  id: string
  uploadId: string
  kind: PortraitKind
  userId: string | null
  leagueId: string | null
  dominantColor: string
}

function ownerIdOf(row: { kind: PortraitKind; userId: string | null; leagueId: string | null }) {
  return row.kind === 'avatar' ? row.userId : row.leagueId
}

function toStoredPortrait(row: PortraitRow): StoredPortrait | null {
  const ownerId = ownerIdOf(row)
  if (ownerId === null) return null
  return {
    id: row.id,
    uploadId: row.uploadId,
    kind: row.kind,
    ownerId,
    dominantColor: row.dominantColor,
  }
}

function ownerCondition(owner: PortraitOwner) {
  return owner.kind === 'avatar'
    ? and(eq(portraits.kind, 'avatar'), eq(portraits.userId, owner.ownerId))
    : and(eq(portraits.kind, 'league'), eq(portraits.leagueId, owner.ownerId))
}

/** Returns the current portrait of an owner, locking its row `FOR UPDATE` when `lock` is set. */
export async function findPortraitForOwner(
  db: DbExecutor,
  owner: PortraitOwner,
  options?: { lock?: boolean },
): Promise<StoredPortrait | null> {
  const query = db.select(portraitColumns).from(portraits).where(ownerCondition(owner)).limit(1)
  const rows = options?.lock === true ? await query.for('update') : await query
  const row = rows[0]
  return row === undefined ? null : toStoredPortrait(row)
}

/** Deletes a portrait row, then the upload row it was rendered from. */
export async function deletePortraitAndUpload(
  db: DbExecutor,
  portrait: StoredPortrait,
): Promise<void> {
  await db.delete(portraits).where(eq(portraits.id, portrait.id))
  await db.delete(uploads).where(eq(uploads.id, portrait.uploadId))
}

/** Returns the storage keys of a portrait's variants. */
export function portraitKeysOf(portrait: StoredPortrait): string[] {
  return storedPortraitKeys({
    kind: portrait.kind,
    ownerId: portrait.ownerId,
    uploadId: portrait.uploadId,
  })
}

/** Returns the storage prefixes of every Moment selfie a post or a card references. */
async function listLiveSelfiePrefixes(db: DbExecutor): Promise<string[]> {
  const fromPosts = await db
    .select({ leagueId: momentPosts.leagueId, uploadId: momentPosts.selfieUploadId })
    .from(momentPosts)
  const fromCards = await db
    .select({ leagueId: cards.leagueId, uploadId: cards.momentSelfieUploadId })
    .from(cards)
    .where(isNotNull(cards.momentSelfieUploadId))
  return [...fromPosts, ...fromCards].flatMap((row) =>
    row.uploadId === null ? [] : [selfiePrefix({ leagueId: row.leagueId, uploadId: row.uploadId })],
  )
}

/** Returns the storage prefixes of every portrait row, every Moment selfie and every portrait or selfie upload being rendered. */
export async function listLivePortraitPrefixes(db: DbExecutor): Promise<Set<string>> {
  const stored = await db
    .select({
      kind: portraits.kind,
      userId: portraits.userId,
      leagueId: portraits.leagueId,
      uploadId: portraits.uploadId,
    })
    .from(portraits)
  const rendering = await db
    .select({
      kind: uploads.kind,
      userId: uploads.userId,
      leagueId: uploads.leagueId,
      uploadId: uploads.id,
    })
    .from(uploads)
    .where(and(ne(uploads.kind, 'card'), inArray(uploads.status, [...RENDERING_UPLOAD_STATUSES])))
  const prefixes = [...stored, ...rendering].flatMap((row) => {
    if (row.kind === 'card') return []
    if (row.kind === 'selfie') {
      return row.leagueId === null
        ? []
        : [selfiePrefix({ leagueId: row.leagueId, uploadId: row.uploadId })]
    }
    const ownerId = ownerIdOf({ kind: row.kind, userId: row.userId, leagueId: row.leagueId })
    return ownerId === null
      ? []
      : [portraitPrefix({ kind: row.kind, ownerId, uploadId: row.uploadId })]
  })
  return new Set([...prefixes, ...(await listLiveSelfiePrefixes(db))])
}
