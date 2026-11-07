import { describe, expect, it } from 'vitest'
import { evaluateInvitation, invitationExpiry } from './invitations'

const now = new Date('2026-11-07T12:00:00Z')
const inv = {
  expiresAt: new Date('2026-11-14T12:00:00Z'),
  maxUses: 10,
  uses: 3,
  revokedAt: null,
}

describe('invitations', () => {
  it('is valid', () => expect(evaluateInvitation(inv, now)).toBe('valid'))
  it('is expired at the exact expiry instant', () =>
    expect(evaluateInvitation({ ...inv, expiresAt: now }, now)).toBe('expired'))
  it('is exhausted when uses reach maxUses', () =>
    expect(evaluateInvitation({ ...inv, uses: 10 }, now)).toBe('exhausted'))
  it('reports revoked before expired', () =>
    expect(evaluateInvitation({ ...inv, revokedAt: now, expiresAt: now }, now)).toBe('revoked'))
  it('computes expiry from days', () =>
    expect(invitationExpiry(now, 7).toISOString()).toBe('2026-11-14T12:00:00.000Z'))
})
