import { MAX_PUBLISH_BATCH, type UploadQuota } from '@storix/shared'

export type CapacityKind = 'dailyQuota' | 'batch'

export interface DraftCapacity {
  kind: CapacityKind
  slots: number
}

export interface DraftOverflow {
  kind: CapacityKind
  skipped: number
  accepted: number
}

/** Stack size cap for admins and owners, whose daily quota is unlimited (R16). */
export const UNLIMITED_BATCH_SIZE = MAX_PUBLISH_BATCH

/** Derives the draft capacity: the remaining daily quota, or one batch for unlimited roles. */
export function draftCapacityOf(quota: UploadQuota): DraftCapacity {
  return quota.unlimited
    ? { kind: 'batch', slots: UNLIMITED_BATCH_SIZE }
    : { kind: 'dailyQuota', slots: quota.remaining }
}
