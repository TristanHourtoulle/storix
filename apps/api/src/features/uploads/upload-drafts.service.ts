import type { Database } from '@storix/db'
import {
  canEditDraft,
  DRAFT_TTL_MS,
  type EditUploadBody,
  type MediaVariantSize,
  type UploadDraft,
  type UploadState,
} from '@storix/shared'
import { AppError, notFound } from '../../lib/errors'
import type { MediaSigner } from '../../lib/media-signer'
import { toImageSet } from '../cards/image-set'
import type { Membership } from '../leagues/leagues.service'
import { assertTaggedMembers } from './assert-tagged-members'
import {
  findOwnedUploadRow,
  listDrafts,
  listOwnedStates,
  markDiscarded,
  updateDraftFields,
  type DraftRow,
} from './upload-drafts.repository'
import { toUploadState } from './upload-state'
import type { UploadRow } from './uploads.repository'

const DRAFT_IMAGE_SIZES: readonly MediaVariantSize[] = [768, 1600]

export interface UploadDraftsService {
  editUpload(m: Membership, uploadId: string, body: EditUploadBody): Promise<UploadState>
  listDrafts(m: Membership): Promise<UploadDraft[]>
  listStates(m: Membership, ids: string[]): Promise<UploadState[]>
  discard(m: Membership, ids: string[]): Promise<void>
}

function notEditable(row: UploadRow): AppError {
  return new AppError('UPLOAD_NOT_EDITABLE', 409, 'The upload can no longer be edited', {
    status: row.status,
  })
}

function draftTitleOf(title: string | undefined): string | null | undefined {
  if (title === undefined) return undefined
  return title === '' ? null : title
}

function inRequestOrder(rows: readonly UploadRow[], ids: readonly string[]): UploadRow[] {
  const byId = new Map(rows.map((row) => [row.id, row]))
  return ids.flatMap((id) => {
    const row = byId.get(id)
    return row === undefined ? [] : [row]
  })
}

function toDraft(row: DraftRow, signer: MediaSigner): UploadDraft {
  const staged = row.status === 'staged' ? row.media : null
  return {
    uploadId: row.id,
    status: row.status === 'staged' || row.status === 'processing' ? row.status : 'uploaded',
    title: row.title,
    taggedUserIds: row.taggedUserIds,
    crop: row.crop,
    capturedAt: (row.media?.capturedAt ?? row.clientCapturedAt)?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    expiresAt: new Date(row.createdAt.getTime() + DRAFT_TTL_MS).toISOString(),
    media:
      staged === null
        ? null
        : {
            image: toImageSet(staged.variants, DRAFT_IMAGE_SIZES, signer),
            thumbhash: staged.thumbhash,
            width: staged.width,
            height: staged.height,
          },
  }
}

/** Builds the upload drafts service: editing, listing, polling and discarding the member's own drafts. */
export function createUploadDraftsService(deps: {
  db: Database
  signer: MediaSigner
  clock: () => Date
}): UploadDraftsService {
  const { db, signer, clock } = deps

  async function findOwned(m: Membership, uploadId: string): Promise<UploadRow> {
    const row = await findOwnedUploadRow(db, { leagueId: m.leagueId, userId: m.userId, uploadId })
    if (row === null) throw notFound('Upload not found')
    return row
  }

  return {
    async editUpload(m, uploadId, body) {
      const row = await findOwned(m, uploadId)
      if (!canEditDraft(row)) throw notEditable(row)
      if (body.taggedUserIds !== undefined) {
        await assertTaggedMembers(db, m.leagueId, body.taggedUserIds)
      }
      const updated = await updateDraftFields(db, {
        id: row.id,
        title: draftTitleOf(body.title),
        taggedUserIds: body.taggedUserIds,
        crop: body.crop,
      })
      const current = await findOwned(m, uploadId)
      if (!updated) throw notEditable(current)
      return toUploadState(current)
    },

    async listDrafts(m) {
      const now = clock().getTime()
      const rows = await listDrafts(db, { leagueId: m.leagueId, userId: m.userId })
      return rows
        .filter((row) => row.createdAt.getTime() + DRAFT_TTL_MS > now)
        .map((row) => toDraft(row, signer))
    },

    async listStates(m, ids) {
      const rows = await listOwnedStates(db, { leagueId: m.leagueId, userId: m.userId, ids })
      return inRequestOrder(rows, ids).map(toUploadState)
    },

    async discard(m, ids) {
      await markDiscarded(db, { leagueId: m.leagueId, userId: m.userId, ids, now: clock() })
    },
  }
}
