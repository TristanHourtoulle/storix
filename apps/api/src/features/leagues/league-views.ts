import type { LeagueSummary } from '@storix/shared'
import type { MediaSigner } from '../../lib/media-signer'
import { toPortraitView } from '../portraits/portrait-view'
import type { LeagueSummaryRow } from './leagues.repository'

/** Maps a league summary row to its public summary with the signed league photo. */
export function toLeagueSummary(row: LeagueSummaryRow, signer: MediaSigner): LeagueSummary {
  const { photoUploadId, photoColor, ...summary } = row
  const photo =
    photoUploadId === null || photoColor === null
      ? null
      : toPortraitView(
          { kind: 'league', ownerId: row.id, uploadId: photoUploadId, dominantColor: photoColor },
          signer,
        )
  return { ...summary, photo }
}
