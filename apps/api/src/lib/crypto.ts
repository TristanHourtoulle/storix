import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { RESET_CODE_ALPHABET, RESET_CODE_LENGTH } from '@storix/shared'

const INVITATION_TOKEN_BYTES = 32
const HEX_PATTERN = /^[0-9a-f]*$/i

/** Generates an invitation token: 32 random bytes encoded as 43 base64url characters. */
export function generateInvitationToken(): string {
  return randomBytes(INVITATION_TOKEN_BYTES).toString('base64url')
}

/** Generates a reset code drawn uniformly from the reset code alphabet. */
export function generateResetCode(): string {
  return Array.from({ length: RESET_CODE_LENGTH }, () =>
    RESET_CODE_ALPHABET.charAt(randomInt(RESET_CODE_ALPHABET.length)),
  ).join('')
}

/** Returns the SHA-256 digest of the value as lowercase hex. */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

/** Compares two hex strings in constant time; false when lengths or encodings differ. */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length || a.length % 2 !== 0) return false
  if (!HEX_PATTERN.test(a) || !HEX_PATTERN.test(b)) return false
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
}
