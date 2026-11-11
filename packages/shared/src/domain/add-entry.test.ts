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
  it('opens a fresh member with room and no block', () => {
    expect(shotStripStatus({ quota: limited(10, 0), draftCount: 0, shotCount: 0 })).toEqual({
      left: 10,
      chip: { kind: 'places', left: 10 },
      canShoot: true,
      continueCount: 0,
      block: null,
    })
  })
  it('counts shots against the remaining quota', () => {
    const s = shotStripStatus({ quota: limited(10, 0), draftCount: 0, shotCount: 3 })
    expect([s.left, s.continueCount, s.block]).toEqual([7, 3, null])
  })
  it('does not count drafts twice for a limited member', () => {
    const s = shotStripStatus({ quota: limited(4, 6), draftCount: 3, shotCount: 0 })
    expect([s.left, s.continueCount, s.block]).toEqual([4, 3, null])
  })
  it('blocks shots but keeps drafts continuable when the quota is full', () => {
    expect(shotStripStatus({ quota: limited(0, 10), draftCount: 3, shotCount: 0 })).toEqual({
      left: 0,
      chip: { kind: 'places', left: 0 },
      canShoot: false,
      continueCount: 3,
      block: 'quota',
    })
  })
  it('clamps left at 0 when shots exceed remaining', () => {
    const s = shotStripStatus({ quota: limited(2, 8), draftCount: 0, shotCount: 3 })
    expect([s.left, s.canShoot, s.chip]).toEqual([0, false, { kind: 'places', left: 0 }])
  })
  it('never caps an admin, whatever the drafts and shots', () => {
    const s = shotStripStatus({ quota: admin(120), draftCount: 80, shotCount: 40 })
    expect([s.left, s.chip, s.canShoot, s.continueCount, s.block]).toEqual([
      Number.POSITIVE_INFINITY,
      { kind: 'unlimited' },
      true,
      120,
      null,
    ])
  })
})

describe('fitShots', () => {
  it('keeps what fits and skips the rest', () =>
    expect(fitShots(3, 5)).toEqual({ accepted: 3, skipped: 2 }))
  it('skips everything when full', () =>
    expect(fitShots(0, 1)).toEqual({ accepted: 0, skipped: 1 }))
  it('handles an empty pick', () => expect(fitShots(10, 0)).toEqual({ accepted: 0, skipped: 0 }))
  it('treats a negative left as 0', () =>
    expect(fitShots(-2, 1)).toEqual({ accepted: 0, skipped: 1 }))
})
