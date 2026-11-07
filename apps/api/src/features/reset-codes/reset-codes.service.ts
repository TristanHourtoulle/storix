import type { Database } from '@storix/db'
import {
  canIssueResetCode,
  formatResetCode,
  isResetCodeRedeemable,
  normalizeResetCode,
  resetCodeExpiry,
  type IssueResetCodeResponse,
  type RedeemResetCodeBody,
} from '@storix/shared'
import type { AuthGateway } from '../../auth/auth.gateway'
import { generateResetCode, safeEqualHex, sha256Hex } from '../../lib/crypto'
import { AppError, notFound } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import { insertAuditEntry } from '../audit/audit.repository'
import { findOwnerId } from '../leagues/leagues.repository'
import type { Membership } from '../leagues/leagues.service'
import { findMembership } from '../members/members.repository'
import { findUserByUsername, findUserHomeLeague } from '../users/users.repository'
import {
  deleteUnusedCodes,
  findLatestUnusedCode,
  incrementFailedAttempts,
  insertResetCode,
  markCodeUsed,
} from './reset-codes.repository'

export interface ResetCodesService {
  issue(m: Membership, targetUserId: string): Promise<IssueResetCodeResponse>
  redeem(body: RedeemResetCodeBody): Promise<void>
}

export interface ResetCodesServiceDeps {
  db: Database
  auth: AuthGateway
  clock: () => Date
}

function invalidResetCode(): AppError {
  return new AppError('INVALID_RESET_CODE', 400, 'Invalid or expired reset code')
}

/** Builds the reset codes service. */
export function createResetCodesService(deps: ResetCodesServiceDeps): ResetCodesService {
  const { db, auth, clock } = deps

  async function loadHomeLeagueContext(
    homeLeagueId: string | null,
    targetUserId: string,
  ): Promise<{ homeLeagueOwnerId: string | null; targetIsHomeLeagueMember: boolean }> {
    if (homeLeagueId === null) return { homeLeagueOwnerId: null, targetIsHomeLeagueMember: false }
    const [homeLeagueOwnerId, membership] = await Promise.all([
      findOwnerId(db, homeLeagueId),
      findMembership(db, homeLeagueId, targetUserId),
    ])
    return { homeLeagueOwnerId, targetIsHomeLeagueMember: membership !== null }
  }

  return {
    async issue(m, targetUserId) {
      const target = await findUserHomeLeague(db, targetUserId)
      if (target === null) throw notFound('Member not found')
      const context = await loadHomeLeagueContext(target.homeLeagueId, targetUserId)
      const decision = canIssueResetCode({
        issuerId: m.userId,
        leagueId: m.leagueId,
        targetUserId,
        targetHomeLeagueId: target.homeLeagueId,
        ...context,
      })
      if (!decision.allowed) {
        throw new AppError('RESET_NOT_ALLOWED', 403, 'Reset code not allowed', {
          reason: decision.reason,
        })
      }
      const code = generateResetCode()
      const expiresAt = resetCodeExpiry(clock())
      await runInTransaction(db, async (tx) => {
        await deleteUnusedCodes(tx, targetUserId)
        await insertResetCode(tx, {
          userId: targetUserId,
          issuedBy: m.userId,
          codeHash: sha256Hex(code),
          expiresAt,
        })
        await insertAuditEntry(tx, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId,
          action: 'reset_code.issued',
          metadata: { expiresAt: expiresAt.toISOString() },
        })
      })
      return { code: formatResetCode(code), expiresAt: expiresAt.toISOString() }
    },

    async redeem(body) {
      const now = clock()
      const target = await findUserByUsername(db, body.username)
      if (target === null) throw invalidResetCode()
      const stored = await findLatestUnusedCode(db, target.id)
      if (stored === null || !isResetCodeRedeemable(stored, now)) throw invalidResetCode()
      const submittedHash = sha256Hex(normalizeResetCode(body.code))
      if (!safeEqualHex(submittedHash, stored.codeHash)) {
        await runInTransaction(db, async (tx) => {
          await incrementFailedAttempts(tx, stored.id)
          await insertAuditEntry(tx, {
            leagueId: target.homeLeagueId,
            actorId: null,
            targetUserId: target.id,
            action: 'reset_code.failed',
            metadata: { failedAttempts: stored.failedAttempts + 1 },
          })
        })
        throw invalidResetCode()
      }
      if (!(await markCodeUsed(db, stored.id, now))) throw invalidResetCode()
      await auth.setPassword(target.id, body.newPassword)
      await auth.revokeAllSessions(target.id)
      await insertAuditEntry(db, {
        leagueId: target.homeLeagueId,
        actorId: target.id,
        targetUserId: target.id,
        action: 'reset_code.redeemed',
      })
    },
  }
}
