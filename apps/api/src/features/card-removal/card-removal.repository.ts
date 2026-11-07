import {
  cardCompensations,
  cardCopies,
  cardRemovals,
  cards,
  media,
  memberWallets,
  uploads,
  type DbExecutor,
} from '@storix/db'
import type { RemovalReason, RemovedCopy, UploadStatus } from '@storix/shared'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'

export interface RemovableCardRow {
  id: string
  leagueId: string
  number: number
  authorId: string | null
  mediaId: string
  uploadId: string
  leagueIdOfMedia: string
  sourceSha256: string
  variantKeys: string[]
}

export interface TombstoneRow {
  cardId: string
  leagueId: string
  number: number
  mediaPrefix: string
  reason: RemovalReason
  actorId: string | null
}

export interface CompensationRow {
  cardId: string
  leagueId: string
  userId: string
  dust: number
}

export interface OpenUploadKey {
  id: string
  objectKey: string
}

const OPEN_UPLOAD_STATUSES: readonly UploadStatus[] = [
  'pending',
  'uploaded',
  'processing',
  'rejected',
  'failed',
]

/** Locks the given cards of a league and their media rows, ordered by card id. */
export async function lockCards(
  db: DbExecutor,
  input: { leagueId: string; cardIds: readonly string[] },
): Promise<RemovableCardRow[]> {
  if (input.cardIds.length === 0) return []
  const rows = await db
    .select({
      id: cards.id,
      leagueId: cards.leagueId,
      number: cards.number,
      authorId: cards.authorId,
      mediaId: cards.mediaId,
      uploadId: media.uploadId,
      leagueIdOfMedia: media.leagueId,
      sourceSha256: media.sourceSha256,
      variants: media.variants,
    })
    .from(cards)
    .innerJoin(media, eq(media.id, cards.mediaId))
    .where(
      and(
        inArray(cards.id, [...input.cardIds]),
        eq(cards.leagueId, input.leagueId),
        eq(media.leagueId, input.leagueId),
      ),
    )
    .orderBy(asc(cards.id))
    .for('update')
  return rows.map(({ variants, ...row }) => ({
    ...row,
    variantKeys: variants.map((variant) => variant.key),
  }))
}

/** Lists every owned copy of the given cards. */
export async function listCopiesOfCards(
  db: DbExecutor,
  cardIds: readonly string[],
): Promise<RemovedCopy[]> {
  if (cardIds.length === 0) return []
  return db
    .select({
      ownerId: cardCopies.ownerId,
      cardId: cardCopies.cardId,
      tierAtMint: cardCopies.tierAtMint,
      variant: cardCopies.variant,
    })
    .from(cardCopies)
    .where(inArray(cardCopies.cardId, [...cardIds]))
}

/** Adds dust to an existing member wallet, failing when the wallet does not exist. */
export async function creditDust(
  db: DbExecutor,
  input: { leagueId: string; userId: string; dust: number },
): Promise<void> {
  const rows = await db
    .update(memberWallets)
    .set({ dust: sql`${memberWallets.dust} + ${input.dust}`, updatedAt: new Date() })
    .where(and(eq(memberWallets.leagueId, input.leagueId), eq(memberWallets.userId, input.userId)))
    .returning({ userId: memberWallets.userId })
  if (rows.length === 0) throw new Error('Member wallet not found')
}

/** Records the tombstones of removed cards. */
export async function insertTombstones(
  db: DbExecutor,
  rows: readonly TombstoneRow[],
): Promise<void> {
  if (rows.length === 0) return
  await db.insert(cardRemovals).values([...rows])
}

/** Records the dust credited to each owner for each removed card. */
export async function insertCompensations(
  db: DbExecutor,
  rows: readonly CompensationRow[],
): Promise<void> {
  if (rows.length === 0) return
  await db.insert(cardCompensations).values([...rows])
}

/** Deletes cards, cascading to their copies, tags, reactions and history. */
export async function deleteCards(db: DbExecutor, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return
  await db.delete(cards).where(inArray(cards.id, [...ids]))
}

/** Deletes media rows. */
export async function deleteMedia(db: DbExecutor, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return
  await db.delete(media).where(inArray(media.id, [...ids]))
}

/** Deletes the uploads that produced removed media. */
export async function deleteUploadsForMedia(
  db: DbExecutor,
  uploadIds: readonly string[],
): Promise<void> {
  await deleteUploads(db, uploadIds)
}

/** Lists the ids of the cards a member authored in a league. */
export async function findCardIdsByAuthor(
  db: DbExecutor,
  input: { leagueId: string; authorId: string },
): Promise<string[]> {
  const rows = await db
    .select({ id: cards.id })
    .from(cards)
    .where(and(eq(cards.leagueId, input.leagueId), eq(cards.authorId, input.authorId)))
    .orderBy(asc(cards.id))
  return rows.map((row) => row.id)
}

/** Lists a member's uploads that never became a card, in one league or in all of them. */
export async function listOpenUploadKeys(
  db: DbExecutor,
  input: { leagueId?: string; userId: string },
): Promise<OpenUploadKey[]> {
  return db
    .select({ id: uploads.id, objectKey: uploads.objectKey })
    .from(uploads)
    .where(
      and(
        eq(uploads.userId, input.userId),
        input.leagueId === undefined ? undefined : eq(uploads.leagueId, input.leagueId),
        inArray(uploads.status, [...OPEN_UPLOAD_STATUSES]),
      ),
    )
    .orderBy(asc(uploads.id))
}

/** Deletes uploads by id. */
export async function deleteUploads(db: DbExecutor, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return
  await db.delete(uploads).where(inArray(uploads.id, [...ids]))
}
