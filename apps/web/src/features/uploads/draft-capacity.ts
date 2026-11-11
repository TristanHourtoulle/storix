import type { UploadQuota } from '@storix/shared'

export type CapacityKind = 'dailyQuota' | 'unlimited'

export interface DraftCapacity {
  kind: CapacityKind
  slots: number
}

export interface DraftOverflow {
  kind: CapacityKind
  skipped: number
  accepted: number
}

/** Derives the draft capacity: the remaining daily quota, or no cap for admins and owners (R16). */
export function draftCapacityOf(quota: UploadQuota): DraftCapacity {
  return quota.unlimited
    ? { kind: 'unlimited', slots: Number.POSITIVE_INFINITY }
    : { kind: 'dailyQuota', slots: quota.remaining }
}
