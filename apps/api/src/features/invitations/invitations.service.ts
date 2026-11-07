import type { Database, DbExecutor } from '@storix/db'
import {
  canManageInvitations,
  evaluateInvitation,
  invitationExpiry,
  type CreateInvitationBody,
  type CreateInvitationResponse,
  type InvitationPreview,
  type InvitationStatus,
  type InvitationSummary,
  type JoinResponse,
  type SignupBody,
} from '@storix/shared'
import type { AuthGateway } from '../../auth/auth.gateway'
import { generateInvitationToken, sha256Hex } from '../../lib/crypto'
import { AppError, forbidden, notFound } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import { insertAuditEntry } from '../audit/audit.repository'
import type { Membership } from '../leagues/leagues.service'
import { countMembers } from '../leagues/leagues.repository'
import { findMembership, insertMember } from '../members/members.repository'
import { findUserByUsername, setHomeLeagueIfUnset } from '../users/users.repository'
import {
  consumeInvitationUse,
  findInvitationByTokenHash,
  insertInvitation,
  listActiveInvitations,
  revokeInvitation,
  type InvitationRow,
  type InvitationWithContext,
} from './invitations.repository'

export interface InvitationsService {
  createInvitation(m: Membership, body: CreateInvitationBody): Promise<CreateInvitationResponse>
  listInvitations(m: Membership): Promise<InvitationSummary[]>
  revokeInvitation(m: Membership, invitationId: string): Promise<void>
  previewInvitation(token: string, viewerId: string | null): Promise<InvitationPreview>
  signupWithInvitation(token: string, body: SignupBody): Promise<JoinResponse>
  acceptInvitation(token: string, userId: string): Promise<JoinResponse>
}

export interface InvitationsServiceDeps {
  db: Database
  auth: AuthGateway
  clock: () => Date
  appOrigin: string
}

function invitationInvalid(status: InvitationStatus | 'unknown'): AppError {
  return new AppError('INVITATION_INVALID', 410, 'Invitation is no longer valid', { status })
}

function toSummary(row: InvitationRow, now: Date): InvitationSummary {
  return {
    id: row.id,
    createdBy: row.createdBy,
    expiresAt: row.expiresAt.toISOString(),
    maxUses: row.maxUses,
    uses: row.uses,
    status: evaluateInvitation(row, now),
  }
}

function assertCanManage(m: Membership): void {
  if (!canManageInvitations(m.role)) throw forbidden()
}

/** Builds the invitations service. */
export function createInvitationsService(deps: InvitationsServiceDeps): InvitationsService {
  const { db, auth, clock } = deps
  const joinBaseUrl = new URL('/join/', deps.appOrigin).toString()

  async function findRedeemable(token: string, now: Date): Promise<InvitationWithContext> {
    const invitation = await findInvitationByTokenHash(db, sha256Hex(token))
    if (invitation === null) throw invitationInvalid('unknown')
    const status = evaluateInvitation(invitation, now)
    if (status !== 'valid') throw invitationInvalid(status)
    return invitation
  }

  async function consumeOrThrow(tx: DbExecutor, invitationId: string, now: Date): Promise<void> {
    const consumed = await consumeInvitationUse(tx, invitationId, now)
    if (!consumed) throw invitationInvalid('exhausted')
  }

  return {
    async createInvitation(m, body) {
      assertCanManage(m)
      const now = clock()
      const token = generateInvitationToken()
      const row = await runInTransaction(db, async (tx) => {
        const inserted = await insertInvitation(tx, {
          leagueId: m.leagueId,
          createdBy: m.userId,
          tokenHash: sha256Hex(token),
          expiresAt: invitationExpiry(now, body.expiresInDays),
          maxUses: body.maxUses,
        })
        await insertAuditEntry(tx, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId: null,
          action: 'invitation.created',
          metadata: {
            invitationId: inserted.id,
            expiresInDays: body.expiresInDays,
            maxUses: body.maxUses,
          },
        })
        return inserted
      })
      return { invitation: toSummary(row, now), url: `${joinBaseUrl}${token}` }
    },

    async listInvitations(m) {
      assertCanManage(m)
      const now = clock()
      const rows = await listActiveInvitations(db, m.leagueId, now)
      return rows.map((row) => toSummary(row, now))
    },

    async revokeInvitation(m, invitationId) {
      assertCanManage(m)
      await runInTransaction(db, async (tx) => {
        const revoked = await revokeInvitation(tx, m.leagueId, invitationId, clock())
        if (!revoked) throw notFound('Invitation not found')
        await insertAuditEntry(tx, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId: null,
          action: 'invitation.revoked',
          metadata: { invitationId },
        })
      })
    },

    async previewInvitation(token, viewerId) {
      const invitation = await findInvitationByTokenHash(db, sha256Hex(token))
      if (invitation === null) throw notFound('Invitation not found')
      const status = evaluateInvitation(invitation, clock())
      const isMember =
        viewerId !== null && (await findMembership(db, invitation.leagueId, viewerId)) !== null
      if (status !== 'valid') return { status, league: null, invitedBy: null, isMember }
      return {
        status,
        league: {
          name: invitation.leagueName,
          memberCount: await countMembers(db, invitation.leagueId),
        },
        invitedBy: invitation.createdByName,
        isMember,
      }
    },

    async signupWithInvitation(token, body) {
      const invitation = await findRedeemable(token, clock())
      if ((await findUserByUsername(db, body.username)) !== null) {
        throw new AppError('USERNAME_TAKEN', 409, 'Username already taken')
      }
      const { userId } = await auth.createCredentialUser(body)
      try {
        await runInTransaction(db, async (tx) => {
          await consumeOrThrow(tx, invitation.id, clock())
          await insertMember(tx, { leagueId: invitation.leagueId, userId, role: 'member' })
          await setHomeLeagueIfUnset(tx, userId, invitation.leagueId)
          await insertAuditEntry(tx, {
            leagueId: invitation.leagueId,
            actorId: userId,
            targetUserId: userId,
            action: 'member.joined',
            metadata: { invitationId: invitation.id, via: 'signup' },
          })
        })
      } catch (error) {
        try {
          await auth.deleteUser(userId)
        } catch (cleanupError) {
          throw new AggregateError([error, cleanupError], 'Signup compensation failed', {
            cause: cleanupError,
          })
        }
        throw error
      }
      return { leagueId: invitation.leagueId }
    },

    async acceptInvitation(token, userId) {
      const invitation = await findRedeemable(token, clock())
      if ((await findMembership(db, invitation.leagueId, userId)) !== null) {
        throw new AppError('ALREADY_MEMBER', 409, 'Already a member of this league')
      }
      await runInTransaction(db, async (tx) => {
        await consumeOrThrow(tx, invitation.id, clock())
        await insertMember(tx, { leagueId: invitation.leagueId, userId, role: 'member' })
        await insertAuditEntry(tx, {
          leagueId: invitation.leagueId,
          actorId: userId,
          targetUserId: userId,
          action: 'member.joined',
          metadata: { invitationId: invitation.id, via: 'accept' },
        })
      })
      return { leagueId: invitation.leagueId }
    },
  }
}
