import { describe, expect, it } from 'vitest'
import {
  checkUploadQuota,
  isUploadQuotaExempt,
  isUploadReservationExpired,
  remainingUploadQuota,
  resolveUploadQuota,
  sanitizeCaptureDate,
  UPLOAD_COMPLETION_GRACE_SECONDS,
  UPLOAD_PRESIGN_TTL_SECONDS,
  uploadQuotaWindowStart,
  uploadReservationCutoff,
} from './uploads'

describe('uploads', () => {
  it('computes remaining quota', () => {
    expect(remainingUploadQuota({ limit: 10, used: 7 })).toBe(3)
    expect(remainingUploadQuota({ limit: 10, used: 12 })).toBe(0)
  })
  it('checks a request against the quota', () => {
    expect(checkUploadQuota({ limit: 10, used: 9, requested: 1 })).toEqual({ allowed: true })
    expect(checkUploadQuota({ limit: 10, used: 10, requested: 1 })).toEqual({
      allowed: false,
      remaining: 0,
    })
    expect(checkUploadQuota({ limit: 10, used: 8, requested: 3 })).toEqual({
      allowed: false,
      remaining: 2,
    })
  })
  it('rejects non-positive requests', () => {
    expect(checkUploadQuota({ limit: 10, used: 0, requested: 0 })).toEqual({
      allowed: false,
      remaining: 10,
    })
    expect(checkUploadQuota({ limit: 10, used: 0, requested: -1 })).toEqual({
      allowed: false,
      remaining: 10,
    })
  })
  it('exempts admins and the owner from the upload quota', () => {
    expect(isUploadQuotaExempt('owner')).toBe(true)
    expect(isUploadQuotaExempt('admin')).toBe(true)
    expect(isUploadQuotaExempt('member')).toBe(false)
  })
  it('resolves an unlimited quota for exempt roles, whatever the usage', () => {
    expect(resolveUploadQuota({ role: 'admin', limit: 10, used: 0 })).toEqual({
      unlimited: true,
      limit: null,
      used: 0,
      remaining: null,
    })
    expect(resolveUploadQuota({ role: 'owner', limit: 10, used: 250 })).toEqual({
      unlimited: true,
      limit: null,
      used: 250,
      remaining: null,
    })
  })
  it('resolves the league quota for members', () => {
    expect(resolveUploadQuota({ role: 'member', limit: 10, used: 7 })).toEqual({
      unlimited: false,
      limit: 10,
      used: 7,
      remaining: 3,
    })
    expect(resolveUploadQuota({ role: 'member', limit: 3, used: 5 })).toEqual({
      unlimited: false,
      limit: 3,
      used: 5,
      remaining: 0,
    })
  })
  it('uses a rolling 24h window', () =>
    expect(uploadQuotaWindowStart(new Date('2026-11-07T10:00:00Z')).toISOString()).toBe(
      '2026-11-06T10:00:00.000Z',
    ))
  it('sanitizes untrusted capture dates', () => {
    const now = new Date('2026-11-07T10:00:00Z')
    expect(sanitizeCaptureDate(null, now)).toBeNull()
    expect(sanitizeCaptureDate(new Date('invalid'), now)).toBeNull()
    expect(sanitizeCaptureDate(new Date('1989-12-31T23:59:59Z'), now)).toBeNull()
    expect(sanitizeCaptureDate(new Date('2026-11-08T10:00:01Z'), now)).toBeNull()
    expect(sanitizeCaptureDate(new Date('2026-11-08T10:00:00Z'), now)?.toISOString()).toBe(
      '2026-11-08T10:00:00.000Z',
    )
    expect(sanitizeCaptureDate(new Date('2017-03-03T12:00:00Z'), now)?.toISOString()).toBe(
      '2017-03-03T12:00:00.000Z',
    )
  })
  it('computes the reservation cutoff from the presign ttl plus grace', () => {
    const now = new Date('2026-11-07T12:00:00.000Z')
    const span = (UPLOAD_PRESIGN_TTL_SECONDS + UPLOAD_COMPLETION_GRACE_SECONDS) * 1000
    expect(uploadReservationCutoff(now).getTime()).toBe(now.getTime() - span)
  })
  it('expires reservations strictly older than the cutoff', () => {
    const now = new Date('2026-11-07T12:00:00.000Z')
    const cutoff = uploadReservationCutoff(now)
    expect(isUploadReservationExpired(cutoff, now)).toBe(false)
    expect(isUploadReservationExpired(new Date(cutoff.getTime() - 1), now)).toBe(true)
    expect(isUploadReservationExpired(now, now)).toBe(false)
  })
})
