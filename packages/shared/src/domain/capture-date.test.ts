import { describe, expect, it } from 'vitest'
import { resolveCaptureDate } from './capture-date'

const now = new Date('2026-11-08T10:00:00Z')
const wallClock = new Date(2023, 2, 11, 13, 43, 1)

describe('resolveCaptureDate', () => {
  it('rebuilds the instant from the wall clock and the original offset', () => {
    const result = resolveCaptureDate(
      { DateTimeOriginal: wallClock, OffsetTimeOriginal: '+01:00' },
      now,
    )
    expect(result).toBe('2023-03-11T12:43:01.000Z')
  })

  it('handles negative offsets', () => {
    const result = resolveCaptureDate(
      { DateTimeOriginal: wallClock, OffsetTimeOriginal: '-05:30' },
      now,
    )
    expect(result).toBe('2023-03-11T19:13:01.000Z')
  })

  it('keeps the parsed date when there is no offset', () => {
    expect(resolveCaptureDate({ DateTimeOriginal: wallClock }, now)).toBe(wallClock.toISOString())
  })

  it('keeps the parsed date when the offset is malformed', () => {
    expect(
      resolveCaptureDate({ DateTimeOriginal: wallClock, OffsetTimeOriginal: 'abc' }, now),
    ).toBe(wallClock.toISOString())
  })

  it('falls back to CreateDate when DateTimeOriginal is missing', () => {
    expect(resolveCaptureDate({ CreateDate: wallClock }, now)).toBe(wallClock.toISOString())
  })

  it('falls back to CreateDate when DateTimeOriginal is invalid', () => {
    expect(
      resolveCaptureDate({ DateTimeOriginal: new Date('invalid'), CreateDate: wallClock }, now),
    ).toBe(wallClock.toISOString())
  })

  it('returns null when no date tag is present', () => {
    expect(resolveCaptureDate({}, now)).toBeNull()
    expect(resolveCaptureDate(undefined, now)).toBeNull()
    expect(resolveCaptureDate(null, now)).toBeNull()
  })

  it('returns null for non-date or implausible values', () => {
    expect(resolveCaptureDate({ DateTimeOriginal: '2023:03:11 13:43:01' }, now)).toBeNull()
    expect(resolveCaptureDate({ DateTimeOriginal: new Date('invalid') }, now)).toBeNull()
    expect(
      resolveCaptureDate({ DateTimeOriginal: new Date('1980-01-01T00:00:00Z') }, now),
    ).toBeNull()
    expect(
      resolveCaptureDate({ DateTimeOriginal: new Date('2030-01-01T00:00:00Z') }, now),
    ).toBeNull()
  })
})
