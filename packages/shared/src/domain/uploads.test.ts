import { describe, expect, it } from 'vitest'
import {
  checkUploadQuota,
  isUploadReservationExpired,
  remainingUploadQuota,
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
