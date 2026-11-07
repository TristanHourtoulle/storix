import type { Database } from '@storix/db'
import {
  canChangeRole,
  canIssueResetCode,
  canRemoveMember,
  type LeagueRole,
  type MemberSummary,
} from '@storix/shared'
import { forbidden, notFound } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import { insertAuditEntry } from '../audit/audit.repository'
import { findOwnerIds } from '../leagues/leagues.repository'
import type { Membership } from '../leagues/leagues.service'
import {
  deleteMember,
  findMembership,
  listMembers,
  updateMemberRole,
  type MemberRow,
} from './members.repository'

const ASSIGNABLE_ROLES = ['admin', 'member'] as const satisfies readonly LeagueRole[]

export interface MembersService {
  listMembers(m: Membership): Promise<MemberSummary[]>
  changeRole(m: Membership, targetUserId: string, nextRole: LeagueRole): Promise<void>
  removeMember(m: Membership, targetUserId: string): Promise<void>
}

function toSummary(
  m: Membership,
  row: MemberRow,
  ownerIds: ReadonlyMap<string, string>,
): MemberSummary {
  const isSelf = row.userId === m.userId
  const homeLeagueOwnerId =
    row.homeLeagueId === null ? null : (ownerIds.get(row.homeLeagueId) ?? null)
  return {
    userId: row.userId,
    displayUsername: row.displayUsername,
    role: row.role,
    joinedAt: row.joinedAt.toISOString(),
    isSelf,
    canChangeRole: ASSIGNABLE_ROLES.some((nextRole) =>
      canChangeRole({ actorRole: m.role, targetRole: row.role, nextRole, isSelf }),
    ),
    canRemove: canRemoveMember({ actorRole: m.role, targetRole: row.role, isSelf }),
    canIssueResetCode: canIssueResetCode({
      issuerId: m.userId,
      leagueId: m.leagueId,
      targetUserId: row.userId,
      targetHomeLeagueId: row.homeLeagueId,
      homeLeagueOwnerId,
      targetIsHomeLeagueMember: row.homeLeagueId === m.leagueId,
    }).allowed,
  }
}

/** Builds the members service. */
export function createMembersService(db: Database): MembersService {
  async function findTargetRole(leagueId: string, userId: string): Promise<LeagueRole> {
    const target = await findMembership(db, leagueId, userId)
    if (target === null) throw notFound('Member not found')
    return target.role
  }

  return {
    async listMembers(m) {
      const rows = await listMembers(db, m.leagueId)
      const homeLeagueIds = [
        ...new Set(rows.flatMap((row) => (row.homeLeagueId === null ? [] : [row.homeLeagueId]))),
      ]
      const ownerIds = await findOwnerIds(db, homeLeagueIds)
      return rows.map((row) => toSummary(m, row, ownerIds))
    },

    async changeRole(m, targetUserId, nextRole) {
      const targetRole = await findTargetRole(m.leagueId, targetUserId)
      const isSelf = targetUserId === m.userId
      if (!canChangeRole({ actorRole: m.role, targetRole, nextRole, isSelf })) throw forbidden()
      await runInTransaction(db, async (tx) => {
        await updateMemberRole(tx, m.leagueId, targetUserId, nextRole)
        await insertAuditEntry(tx, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId,
          action: 'member.role_changed',
          metadata: { from: targetRole, to: nextRole },
        })
      })
    },

    async removeMember(m, targetUserId) {
      const targetRole = await findTargetRole(m.leagueId, targetUserId)
      const isSelf = targetUserId === m.userId
      if (!canRemoveMember({ actorRole: m.role, targetRole, isSelf })) throw forbidden()
      await runInTransaction(db, async (tx) => {
        await deleteMember(tx, m.leagueId, targetUserId)
        await insertAuditEntry(tx, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId,
          action: 'member.removed',
          metadata: { role: targetRole },
        })
      })
    },
  }
}
