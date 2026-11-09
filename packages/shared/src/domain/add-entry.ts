import { MAX_PUBLISH_BATCH } from './upload-drafts'
import type { UploadQuotaStatus } from './uploads'

export type ShotChip =
  { kind: 'places'; left: number } | { kind: 'batch'; left: number; max: number }

export type ShotBlock = 'quota' | 'batch'

export interface ShotStripInput {
  quota: UploadQuotaStatus
  draftCount: number
  shotCount: number
}

export interface ShotStripStatus {
  left: number
  chip: ShotChip
  canShoot: boolean
  continueCount: number
  block: ShotBlock | null
}

/** Derives what the camera start screen can still take and shows, from the quota, drafts and shots. */
export function shotStripStatus(input: ShotStripInput): ShotStripStatus {
  const { quota, draftCount, shotCount } = input
  const left = quota.unlimited
    ? Math.max(0, MAX_PUBLISH_BATCH - draftCount - shotCount)
    : Math.max(0, quota.remaining - shotCount)
  const chip: ShotChip = quota.unlimited
    ? { kind: 'batch', left, max: MAX_PUBLISH_BATCH }
    : { kind: 'places', left }
  return {
    left,
    chip,
    canShoot: left > 0,
    continueCount: draftCount + shotCount,
    block: left > 0 ? null : quota.unlimited ? 'batch' : 'quota',
  }
}

/** Splits an incoming pick into what fits in `left` and what is skipped. */
export function fitShots(left: number, incoming: number): { accepted: number; skipped: number } {
  const accepted = Math.min(Math.max(0, left), incoming)
  return { accepted, skipped: incoming - accepted }
}
