import { sql } from 'drizzle-orm'
import { cards } from '@storix/db'
import { selfieKey, type CardMoment } from '@storix/shared'
import type { MediaSigner } from '../../lib/media-signer'

export interface CardMomentColumns {
  leagueId: string
  momentSelfieUploadId: string | null
  momentTakenAt: Date | null
  momentLateMinutes: number | null
}

/** Selects a Moment card's selfie upload id only once that selfie is rendered, so no dead image is ever linked. */
export const readyMomentSelfieUploadId = sql<string | null>`(
  select u.id from uploads u
  where u.id = ${cards.momentSelfieUploadId} and u.status = 'ready'
)`

/** Projects a card's Moment columns to the signed Moment payload, or null for a regular photo. */
export function toCardMoment(row: CardMomentColumns, signer: MediaSigner): CardMoment | null {
  const { leagueId, momentSelfieUploadId: uploadId, momentTakenAt, momentLateMinutes } = row
  if (momentTakenAt === null || momentLateMinutes === null) return null
  return {
    selfieUrl:
      uploadId === null ? null : signer.urlFor(selfieKey({ leagueId, uploadId, size: 600 })),
    selfieSmallUrl:
      uploadId === null ? null : signer.urlFor(selfieKey({ leagueId, uploadId, size: 240 })),
    takenAt: momentTakenAt.toISOString(),
    lateMinutes: momentLateMinutes,
  }
}
