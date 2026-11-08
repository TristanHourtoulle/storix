import {
  and,
  eq,
  exists,
  inArray,
  isNull,
  lt,
  not,
  notExists,
  or,
  sql,
  type AnyColumn,
} from 'drizzle-orm'
import { cards, leagueMembers, media, uploads, type DbExecutor } from '@storix/db'
import { DISCARDED_SWEEP_DELAY_MS, PUBLISH_STUCK_MS, storedMediaKeys } from '@storix/shared/domain'
import type { UploadStatus } from '@storix/shared'
import { requireLeagueId } from './media.repository'

export interface DraftSweepRow {
  id: string
  status: UploadStatus
  stageOnly: boolean
  createdAt: Date
  processedAt: Date | null
  publishRequestedAt: Date | null
  userId: string | null
  isOwnerMember: boolean
  objectKey: string
  mediaId: string | null
  variantKeys: string[]
}

const DELETABLE_DRAFT_STATUSES: UploadStatus[] = ['staged', 'discarded']

function isOwnerMemberOf(db: DbExecutor) {
  return exists(
    db
      .select({ one: sql`1` })
      .from(leagueMembers)
      .where(
        and(eq(leagueMembers.leagueId, uploads.leagueId), eq(leagueMembers.userId, uploads.userId)),
      ),
  )
}

function olderThanOrNull(column: AnyColumn, before: Date) {
  return or(isNull(column), lt(column, before))
}

/** Lists the discarded, publishing and stage-only staged uploads the draft sweep may act on; `classifyDraftForSweep` decides. */
export async function findDraftSweepCandidates(
  db: DbExecutor,
  input: { stagedBefore: Date; now: Date },
): Promise<DraftSweepRow[]> {
  const now = input.now.getTime()
  const rows = await db
    .select({
      id: uploads.id,
      status: uploads.status,
      stageOnly: uploads.stageOnly,
      createdAt: uploads.createdAt,
      processedAt: uploads.processedAt,
      publishRequestedAt: uploads.publishRequestedAt,
      userId: uploads.userId,
      isOwnerMember: isOwnerMemberOf(db).mapWith(Boolean),
      objectKey: uploads.objectKey,
      leagueId: uploads.leagueId,
      mediaId: media.id,
      sourceSha256: media.sourceSha256,
      variants: media.variants,
    })
    .from(uploads)
    .leftJoin(media, eq(media.uploadId, uploads.id))
    .where(
      and(
        eq(uploads.kind, 'card'),
        or(
          and(
            eq(uploads.status, 'discarded'),
            olderThanOrNull(uploads.processedAt, new Date(now - DISCARDED_SWEEP_DELAY_MS)),
          ),
          and(
            eq(uploads.status, 'publishing'),
            olderThanOrNull(uploads.publishRequestedAt, new Date(now - PUBLISH_STUCK_MS)),
          ),
          and(
            eq(uploads.status, 'staged'),
            eq(uploads.stageOnly, true),
            or(
              lt(uploads.createdAt, input.stagedBefore),
              isNull(uploads.userId),
              not(isOwnerMemberOf(db)),
            ),
          ),
        ),
      ),
    )
  return rows.map(({ variants, sourceSha256, ...row }) => ({
    ...row,
    variantKeys:
      sourceSha256 === null
        ? []
        : storedMediaKeys({
            leagueId: requireLeagueId(row),
            sourceSha256,
            variants: variants ?? [],
          }),
  }))
}

/** Deletes a staged or discarded upload and its card-less media; false when the upload changed status or its media is still used. */
export async function deleteDraftRows(
  tx: DbExecutor,
  input: { uploadId: string; mediaId: string | null },
): Promise<boolean> {
  const [locked] = await tx
    .select({ id: uploads.id })
    .from(uploads)
    .where(and(eq(uploads.id, input.uploadId), inArray(uploads.status, DELETABLE_DRAFT_STATUSES)))
    .for('update')
  if (locked === undefined) return false
  if (input.mediaId !== null) {
    await tx.delete(media).where(
      and(
        eq(media.id, input.mediaId),
        notExists(
          tx
            .select({ one: sql`1` })
            .from(cards)
            .where(eq(cards.mediaId, media.id)),
        ),
      ),
    )
  }
  const deleted = await tx
    .delete(uploads)
    .where(
      and(
        eq(uploads.id, input.uploadId),
        notExists(
          tx
            .select({ one: sql`1` })
            .from(media)
            .where(eq(media.uploadId, uploads.id)),
        ),
      ),
    )
    .returning({ id: uploads.id })
  return deleted.length > 0
}
