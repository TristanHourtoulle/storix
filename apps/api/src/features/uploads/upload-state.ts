import type { UploadState } from '@storix/shared'
import type { UploadRow } from './uploads.repository'

/** Maps an upload row to its public state. */
export function toUploadState(row: UploadRow): UploadState {
  return {
    uploadId: row.id,
    status: row.status,
    cardId: row.cardId,
    rejectionReason: row.rejectionReason,
  }
}
