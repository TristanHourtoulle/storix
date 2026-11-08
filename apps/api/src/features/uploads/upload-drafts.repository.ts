import { media, uploads, type DbExecutor } from '@storix/db'
import {
  EDITABLE_DRAFT_STATUSES,
  type CropRect,
  type MediaVariant,
  type PublishCandidate,
} from '@storix/shared'
import { and, asc, eq, inArray, or } from 'drizzle-orm'
import type { UploadRow } from './uploads.repository'

export interface DraftRow {
  id: string
  status: UploadRow['status']
  title: string | null
  taggedUserIds: string[]
  crop: CropRect | null
  clientCapturedAt: Date | null
  createdAt: Date
  media: {
    variants: MediaVariant[]
    thumbhash: string
    width: number
    height: number
    capturedAt: Date | null
  } | null
}

interface OwnerScope {
  leagueId: string
  userId: string
}

function ownedBy(scope: OwnerScope) {
  return and(eq(uploads.leagueId, scope.leagueId), eq(uploads.userId, scope.userId))
}

/** Finds an upload owned by the user within the league. */
export async function findOwnedUploadRow(
  db: DbExecutor,
  input: OwnerScope & { uploadId: string },
): Promise<UploadRow | null> {
  const rows = await db
    .select()
    .from(uploads)
    .where(and(eq(uploads.id, input.uploadId), ownedBy(input)))
    .limit(1)
  return rows[0] ?? null
}

/** Updates the given draft fields while the upload is an editable stage-only draft; false otherwise. */
export async function updateDraftFields(
  db: DbExecutor,
  input: { id: string; title?: string | null; taggedUserIds?: string[]; crop?: CropRect | null },
): Promise<boolean> {
  const rows = await db
    .update(uploads)
    .set({ title: input.title, taggedUserIds: input.taggedUserIds, crop: input.crop })
    .where(
      and(
        eq(uploads.id, input.id),
        eq(uploads.stageOnly, true),
        inArray(uploads.status, [...EDITABLE_DRAFT_STATUSES]),
      ),
    )
    .returning({ id: uploads.id })
  return rows.length > 0
}

/** Lists the user's stage-only drafts in the league, oldest first, with their media once staged. */
export async function listDrafts(db: DbExecutor, input: OwnerScope): Promise<DraftRow[]> {
  const rows = await db
    .select({
      id: uploads.id,
      status: uploads.status,
      title: uploads.title,
      taggedUserIds: uploads.taggedUserIds,
      crop: uploads.crop,
      clientCapturedAt: uploads.clientCapturedAt,
      createdAt: uploads.createdAt,
      mediaId: media.id,
      variants: media.variants,
      thumbhash: media.thumbhash,
      width: media.width,
      height: media.height,
      capturedAt: media.capturedAt,
    })
    .from(uploads)
    .leftJoin(media, eq(media.uploadId, uploads.id))
    .where(
      and(
        ownedBy(input),
        eq(uploads.stageOnly, true),
        inArray(uploads.status, [...EDITABLE_DRAFT_STATUSES]),
      ),
    )
    .orderBy(asc(uploads.createdAt), asc(uploads.id))
  return rows.map(({ mediaId, variants, thumbhash, width, height, capturedAt, ...row }) => ({
    ...row,
    media:
      mediaId === null ||
      variants === null ||
      thumbhash === null ||
      width === null ||
      height === null
        ? null
        : { variants, thumbhash, width, height, capturedAt },
  }))
}

/** Lists the user's uploads among the given ids; unknown and foreign ids are left out. */
export function listOwnedStates(
  db: DbExecutor,
  input: OwnerScope & { ids: readonly string[] },
): Promise<UploadRow[]> {
  return db
    .select()
    .from(uploads)
    .where(and(ownedBy(input), inArray(uploads.id, [...input.ids])))
}

/** Marks the user's discardable uploads among the given ids as discarded; returns how many changed. */
export async function markDiscarded(
  db: DbExecutor,
  input: OwnerScope & { ids: readonly string[]; now: Date },
): Promise<number> {
  const rows = await db
    .update(uploads)
    .set({ status: 'discarded', processedAt: input.now })
    .where(
      and(
        ownedBy(input),
        inArray(uploads.id, [...input.ids]),
        or(
          eq(uploads.status, 'pending'),
          and(eq(uploads.stageOnly, true), inArray(uploads.status, [...EDITABLE_DRAFT_STATUSES])),
        ),
      ),
    )
    .returning({ id: uploads.id })
  return rows.length
}

/** Locks the user's requested uploads for update and reads what the publish plan needs. */
export async function lockPublishCandidates(
  tx: DbExecutor,
  input: OwnerScope & { ids: readonly string[] },
): Promise<PublishCandidate[]> {
  const rows = await tx
    .select({
      uploadId: uploads.id,
      status: uploads.status,
      stageOnly: uploads.stageOnly,
      title: uploads.title,
      crop: uploads.crop,
      width: media.width,
      height: media.height,
    })
    .from(uploads)
    .leftJoin(media, eq(media.uploadId, uploads.id))
    .where(and(ownedBy(input), inArray(uploads.id, [...input.ids])))
    .for('update', { of: uploads })
  return rows.map(({ width, height, ...row }) => ({
    ...row,
    mediaSize: width === null || height === null ? null : { width, height },
  }))
}

/** Moves the given staged uploads to publishing; returns how many changed. */
export async function markPublishing(
  tx: DbExecutor,
  input: { ids: readonly string[]; now: Date },
): Promise<number> {
  const rows = await tx
    .update(uploads)
    .set({ status: 'publishing', publishRequestedAt: input.now })
    .where(and(inArray(uploads.id, [...input.ids]), eq(uploads.status, 'staged')))
    .returning({ id: uploads.id })
  return rows.length
}
