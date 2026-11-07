import { describe, expect, it } from 'vitest'
import {
  canIssueResetCode,
  formatResetCode,
  isResetCodeRedeemable,
  normalizeResetCode,
  resetCodeExpiry,
} from './reset-codes'

const base = {
  issuerId: 'owner',
  leagueId: 'L1',
  targetUserId: 'u1',
  targetHomeLeagueId: 'L1',
  homeLeagueOwnerId: 'owner',
  targetIsHomeLeagueMember: true,
}

describe('reset codes', () => {
  it('allows the owner of the target home league', () =>
    expect(canIssueResetCode(base)).toEqual({ allowed: true }))
  it('refuses an admin who is not the home league owner', () =>
    expect(canIssueResetCode({ ...base, issuerId: 'admin' })).toEqual({
      allowed: false,
      reason: 'NOT_HOME_LEAGUE_OWNER',
    }))
  it('refuses the owner of another league the target joined later', () =>
    expect(canIssueResetCode({ ...base, leagueId: 'L2' })).toEqual({
      allowed: false,
      reason: 'OTHER_LEAGUE',
    }))
  it('refuses when the home league no longer exists', () =>
    expect(canIssueResetCode({ ...base, targetHomeLeagueId: null })).toEqual({
      allowed: false,
      reason: 'NO_HOME_LEAGUE',
    }))
  it('refuses when the home league has no owner', () =>
    expect(canIssueResetCode({ ...base, homeLeagueOwnerId: null })).toEqual({
      allowed: false,
      reason: 'HOME_LEAGUE_HAS_NO_OWNER',
    }))
  it('refuses a self reset', () =>
    expect(canIssueResetCode({ ...base, targetUserId: 'owner' })).toEqual({
      allowed: false,
      reason: 'SELF_RESET',
    }))
  it('refuses when the target left the home league', () =>
    expect(canIssueResetCode({ ...base, targetIsHomeLeagueMember: false })).toEqual({
      allowed: false,
      reason: 'TARGET_LEFT_HOME_LEAGUE',
    }))
  it('expires exactly 24h after issue', () =>
    expect(resetCodeExpiry(new Date('2026-11-07T10:00:00Z')).toISOString()).toBe(
      '2026-11-08T10:00:00.000Z',
    ))
  it('is not redeemable once used, expired, or after 5 failed attempts', () => {
    const now = new Date('2026-11-07T12:00:00Z')
    const ok = { expiresAt: new Date('2026-11-08T00:00:00Z'), usedAt: null, failedAttempts: 0 }
    expect(isResetCodeRedeemable(ok, now)).toBe(true)
    expect(isResetCodeRedeemable({ ...ok, usedAt: now }, now)).toBe(false)
    expect(isResetCodeRedeemable({ ...ok, expiresAt: now }, now)).toBe(false)
    expect(isResetCodeRedeemable({ ...ok, failedAttempts: 5 }, now)).toBe(false)
  })
  it('normalizes user input', () => {
    expect(normalizeResetCode(' abcde-fghjk ')).toBe('ABCDEFGHJK')
    expect(normalizeResetCode('oil0x xxxxx')).toBe('0110XXXXXX')
  })
  it('formats with a dash', () => expect(formatResetCode('ABCDEFGHJK')).toBe('ABCDE-FGHJK'))
})
