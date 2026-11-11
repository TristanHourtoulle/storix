import type { UploadQuotaStatus } from './uploads'

export type ShotChip = { kind: 'places'; left: number } | { kind: 'unlimited' }

export type ShotBlock = 'quota'

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
  const left = quota.unlimited ? Number.POSITIVE_INFINITY : Math.max(0, quota.remaining - shotCount)
  const chip: ShotChip = quota.unlimited ? { kind: 'unlimited' } : { kind: 'places', left }
  return {
    left,
    chip,
    canShoot: left > 0,
    continueCount: draftCount + shotCount,
    block: left > 0 ? null : 'quota',
  }
}

/** Splits an incoming pick into what fits in `left` and what is skipped. */
export function fitShots(left: number, incoming: number): { accepted: number; skipped: number } {
  const accepted = Math.min(Math.max(0, left), incoming)
  return { accepted, skipped: incoming - accepted }
}
