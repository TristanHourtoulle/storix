export const INVITATION_EXPIRY_DAYS = [1, 7, 30] as const

export type InvitationExpiryDays = (typeof INVITATION_EXPIRY_DAYS)[number]

export const INVITATION_MAX_USES_LIMIT = 50

export type InvitationStatus = 'valid' | 'revoked' | 'expired' | 'exhausted'

const DAY_MS = 86_400_000

/** Resolves the invitation status with precedence revoked, expired, exhausted, valid. */
export function evaluateInvitation(
  inv: { expiresAt: Date; maxUses: number; uses: number; revokedAt: Date | null },
  now: Date,
): InvitationStatus {
  if (inv.revokedAt !== null) return 'revoked'
  if (inv.expiresAt.getTime() <= now.getTime()) return 'expired'
  if (inv.uses >= inv.maxUses) return 'exhausted'
  return 'valid'
}

/** Computes the expiry instant of an invitation created at `createdAt`. */
export function invitationExpiry(createdAt: Date, days: InvitationExpiryDays): Date {
  return new Date(createdAt.getTime() + days * DAY_MS)
}
