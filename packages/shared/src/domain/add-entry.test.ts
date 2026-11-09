import { describe, expect, it } from 'vitest'
import { fitShots, shotStripStatus } from './add-entry'
import type { UploadQuotaStatus } from './uploads'

function limited(remaining: number, used: number): UploadQuotaStatus {
  return { unlimited: false, limit: 10, used, remaining }
}

function admin(used: number): UploadQuotaStatus {
  return { unlimited: true, limit: null, used, remaining: null }
}

describe('shotStripStatus', () => {
  it('opens a fresh member on the first-card headline', () => {
    expect(shotStripStatus({ quota: limited(10, 0), draftCount: 0, shotCount: 0 })).toEqual({
      left: 10, chip: { kind: 'places', left: 10 }, canShoot: true, continueCount: 0, headline: 'first',
    })
  })
  it('counts shots against the remaining quota', () => {
    const s = shotStripStatus({ quota: limited(10, 0), draftCount: 0, shotCount: 3 })
    expect([s.left, s.continueCount, s.headline]).toEqual([7, 3, 'default'])
  })
  it('does not count drafts twice for a limited member', () => {
    const s = shotStripStatus({ quota: limited(4, 6), draftCount: 3, shotCount: 0 })
    expect([s.left, s.continueCount, s.headline]).toEqual([4, 3, 'default'])
  })
  it('is not first once something was uploaded in the last 24 h', () => {
    expect(shotStripStatus({ quota: limited(9, 1), draftCount: 0, shotCount: 0 }).headline).toBe('default')
  })
  it('blocks shots but keeps drafts continuable when the quota is full', () => {
    expect(shotStripStatus({ quota: limited(0, 10), draftCount: 3, shotCount: 0 })).toEqual({
      left: 0, chip: { kind: 'places', left: 0 }, canShoot: false, continueCount: 3, headline: 'quotaFull',
    })
  })
  it('clamps left at 0 when shots exceed remaining', () => {
    const s = shotStripStatus({ quota: limited(2, 8), draftCount: 0, shotCount: 3 })
    expect([s.left, s.canShoot, s.chip]).toEqual([0, false, { kind: 'places', left: 0 }])
  })
  it('caps an admin at 30 per batch, drafts included', () => {
    const s = shotStripStatus({ quota: admin(0), draftCount: 3, shotCount: 2 })
    expect([s.left, s.chip, s.continueCount]).toEqual([25, { kind: 'batch', left: 25, max: 30 }, 5])
  })
  it('opens a fresh admin on the first-card headline', () => {
    expect(shotStripStatus({ quota: admin(0), draftCount: 0, shotCount: 0 }).headline).toBe('first')
  })
  it('stops an admin at a full batch', () => {
    const s = shotStripStatus({ quota: admin(12), draftCount: 10, shotCount: 20 })
    expect([s.left, s.canShoot, s.headline]).toEqual([0, false, 'batchFull'])
  })
  it('admin with 35 drafts has no room', () => {
    const s = shotStripStatus({ quota: admin(35), draftCount: 35, shotCount: 0 })
    expect([s.left, s.chip, s.continueCount]).toEqual([0, { kind: 'batch', left: 0, max: 30 }, 35])
  })
})

describe('fitShots', () => {
  it('keeps what fits and skips the rest', () => expect(fitShots(3, 5)).toEqual({ accepted: 3, skipped: 2 }))
  it('skips everything when full', () => expect(fitShots(0, 1)).toEqual({ accepted: 0, skipped: 1 }))
  it('handles an empty pick', () => expect(fitShots(10, 0)).toEqual({ accepted: 0, skipped: 0 }))
  it('treats a negative left as 0', () => expect(fitShots(-2, 1)).toEqual({ accepted: 0, skipped: 1 }))
})
