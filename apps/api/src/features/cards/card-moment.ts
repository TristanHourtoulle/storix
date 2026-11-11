import { selfieKey, type CardMoment } from '@storix/shared'
import type { MediaSigner } from '../../lib/media-signer'

export interface CardMomentColumns {
  leagueId: string
  momentSelfieUploadId: string | null
  momentTakenAt: Date | null
  momentLateMinutes: number | null
}

/** Projects a card's Moment columns to the signed Moment payload, or null for a regular photo. */
export function toCardMoment(row: CardMomentColumns, signer: MediaSigner): CardMoment | null {
  const { leagueId, momentSelfieUploadId: uploadId, momentTakenAt, momentLateMinutes } = row
  if (uploadId === null || momentTakenAt === null || momentLateMinutes === null) return null
  return {
    selfieUrl: signer.urlFor(selfieKey({ leagueId, uploadId, size: 600 })),
    selfieSmallUrl: signer.urlFor(selfieKey({ leagueId, uploadId, size: 240 })),
    takenAt: momentTakenAt.toISOString(),
    lateMinutes: momentLateMinutes,
  }
}
