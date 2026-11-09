import { MAX_PUBLISH_BATCH } from './upload-drafts'
import type { UploadQuotaStatus } from './uploads'

export type ShotChip =
  { kind: 'places'; left: number } | { kind: 'batch'; left: number; max: number }

export type ShotHeadline = 'first' | 'quotaFull' | 'batchFull' | 'default'

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
  headline: ShotHeadline
}

function headlineOf(input: ShotStripInput, left: number): ShotHeadline {
  if (left === 0) return input.quota.unlimited ? 'batchFull' : 'quotaFull'
  const isFirst = input.quota.used === 0 && input.draftCount === 0 && input.shotCount === 0
  return isFirst ? 'first' : 'default'
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
    headline: headlineOf(input, left),
  }
}

/** Splits an incoming pick into what fits in `left` and what is skipped. */
export function fitShots(left: number, incoming: number): { accepted: number; skipped: number } {
  const accepted = Math.min(Math.max(0, left), incoming)
  return { accepted, skipped: incoming - accepted }
}
