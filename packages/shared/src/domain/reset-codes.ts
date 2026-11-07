export const RESET_CODE_TTL_MS = 86_400_000
export const RESET_CODE_MAX_ATTEMPTS = 5
export const RESET_CODE_LENGTH = 10
export const RESET_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

export type ResetCodeDenialReason =
  | 'SELF_RESET'
  | 'NO_HOME_LEAGUE'
  | 'OTHER_LEAGUE'
  | 'HOME_LEAGUE_HAS_NO_OWNER'
  | 'NOT_HOME_LEAGUE_OWNER'
  | 'TARGET_LEFT_HOME_LEAGUE'

/** Decides whether the issuer may create a reset code for the target in this league. */
export function canIssueResetCode(input: {
  issuerId: string
  leagueId: string
  targetUserId: string
  targetHomeLeagueId: string | null
  homeLeagueOwnerId: string | null
  targetIsHomeLeagueMember: boolean
}): { allowed: true } | { allowed: false; reason: ResetCodeDenialReason } {
  if (input.issuerId === input.targetUserId) return { allowed: false, reason: 'SELF_RESET' }
  if (input.targetHomeLeagueId === null) return { allowed: false, reason: 'NO_HOME_LEAGUE' }
  if (input.leagueId !== input.targetHomeLeagueId) return { allowed: false, reason: 'OTHER_LEAGUE' }
  if (input.homeLeagueOwnerId === null) {
    return { allowed: false, reason: 'HOME_LEAGUE_HAS_NO_OWNER' }
  }
  if (input.issuerId !== input.homeLeagueOwnerId) {
    return { allowed: false, reason: 'NOT_HOME_LEAGUE_OWNER' }
  }
  if (!input.targetIsHomeLeagueMember) return { allowed: false, reason: 'TARGET_LEFT_HOME_LEAGUE' }
  return { allowed: true }
}

/** Computes the expiry instant of a reset code issued at `issuedAt`. */
export function resetCodeExpiry(issuedAt: Date): Date {
  return new Date(issuedAt.getTime() + RESET_CODE_TTL_MS)
}

/** Returns true when the code is unused, unexpired and under the attempt limit. */
export function isResetCodeRedeemable(
  code: { expiresAt: Date; usedAt: Date | null; failedAttempts: number },
  now: Date,
): boolean {
  return (
    code.usedAt === null &&
    code.expiresAt.getTime() > now.getTime() &&
    code.failedAttempts < RESET_CODE_MAX_ATTEMPTS
  )
}

const LOOKALIKES: Record<string, string> = { O: '0', I: '1', L: '1' }

/** Uppercases user input, strips separators and maps look-alike letters to digits. */
export function normalizeResetCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/[OIL]/g, (char) => LOOKALIKES[char] ?? char)
}

/** Formats a normalized code as XXXXX-XXXXX. */
export function formatResetCode(normalized: string): string {
  return `${normalized.slice(0, 5)}-${normalized.slice(5)}`
}
