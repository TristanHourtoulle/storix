import type { Database, DbExecutor } from '@storix/db'
import {
  canChangeRole,
  canIssueResetCode,
  canLeaveLeague,
  canRemoveMember,
  canTransferOwnership,
  type LeagueRole,
  type MemberSummary,
} from '@storix/shared'
import type { JobQueue } from '../../jobs/job-queue'
import type { ErrorLogger } from '../../lib/error-logger'
import { AppError, forbidden, notFound } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import { insertAuditEntry } from '../audit/audit.repository'
import {
  deleteUploads,
  findCardIdsByAuthor,
  listOpenUploadKeys,
} from '../card-removal/card-removal.repository'
import type { CardRemoval, RemovalOutcome } from '../card-removal/card-removal.service'
import { findOwnerIds } from '../leagues/leagues.repository'
import type { Membership } from '../leagues/leagues.service'
import { lockLeagueEconomyExclusive } from '../wallets/wallets.repository'
import {
  clearMemberTraces,
  deleteMember,
  findMembership,
  listMembers,
  lockMemberships,
  transferOwnership,
  updateMemberRole,
  type MemberLock,
  type MemberRow,
} from './members.repository'

const ASSIGNABLE_ROLES = ['admin', 'member'] as const satisfies readonly LeagueRole[]

type DetachReason = 'member_removed' | 'member_left'

interface DetachOutcome {
  removal: RemovalOutcome
  uploadKeys: string[]
}

export interface MembersService {
  listMembers(m: Membership): Promise<MemberSummary[]>
  changeRole(m: Membership, targetUserId: string, nextRole: LeagueRole): Promise<void>
  removeMember(m: Membership, targetUserId: string): Promise<void>
  leaveLeague(m: Membership): Promise<void>
  transferOwnership(m: Membership, targetUserId: string): Promise<void>
}

export interface MembersServiceDeps {
  db: Database
  cardRemoval: CardRemoval
  jobs: JobQueue
  logger: ErrorLogger
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
    authoredCardCount: row.authoredCardCount,
    canTransferOwnership: canTransferOwnership({
      actorRole: m.role,
      targetRole: row.role,
      isSelf,
    }),
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

function roleOf(locks: readonly MemberLock[], userId: string): LeagueRole | null {
  return locks.find((lock) => lock.userId === userId)?.role ?? null
}

/** Builds the members service. */
export function createMembersService(deps: MembersServiceDeps): MembersService {
  const { db, cardRemoval, jobs, logger } = deps

  async function findTargetRole(leagueId: string, userId: string): Promise<LeagueRole> {
    const target = await findMembership(db, leagueId, userId)
    if (target === null) throw notFound('Member not found')
    return target.role
  }

  async function lockPair(
    tx: DbExecutor,
    m: Membership,
    targetUserId: string,
  ): Promise<{ actorRole: LeagueRole; targetRole: LeagueRole }> {
    const locks = await lockMemberships(tx, m.leagueId, [m.userId, targetUserId])
    const actorRole = roleOf(locks, m.userId)
    if (actorRole === null) throw notFound()
    const targetRole = roleOf(locks, targetUserId)
    if (targetRole === null) throw notFound('Member not found')
    return { actorRole, targetRole }
  }

  async function detachMember(
    tx: DbExecutor,
    m: Membership,
    targetUserId: string,
    reason: DetachReason,
  ): Promise<DetachOutcome> {
    const openUploads = await listOpenUploadKeys(tx, {
      leagueId: m.leagueId,
      userId: targetUserId,
    })
    const removal = await cardRemoval.removeInTx(tx, {
      leagueId: m.leagueId,
      cardIds: await findCardIdsByAuthor(tx, { leagueId: m.leagueId, authorId: targetUserId }),
      reason,
      actorId: m.userId,
    })
    await deleteUploads(
      tx,
      openUploads.map((upload) => upload.id),
    )
    await clearMemberTraces(tx, { leagueId: m.leagueId, userId: targetUserId })
    if ((await deleteMember(tx, m.leagueId, targetUserId)) === 0) {
      throw notFound('Member not found')
    }
    return { removal, uploadKeys: openUploads.map((upload) => upload.objectKey) }
  }

  async function afterDetach(leagueId: string, outcome: DetachOutcome): Promise<void> {
    await cardRemoval.afterCommit(leagueId, outcome.removal)
    try {
      if (outcome.uploadKeys.length > 0) await jobs.enqueueStorageDelete(outcome.uploadKeys)
    } catch (error) {
      logger.error(
        { err: error, leagueId, keys: outcome.uploadKeys.length },
        'Failed to enqueue departed member uploads deletion',
      )
    }
    if (outcome.removal.removedCardIds.length > 0) return
    try {
      await jobs.enqueueRarityRecompute({ leagueId })
    } catch (error) {
      logger.error({ err: error, leagueId }, 'Failed to enqueue rarity recompute after departure')
    }
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
        if ((await updateMemberRole(tx, m.leagueId, targetUserId, nextRole)) === 0) {
          throw notFound('Member not found')
        }
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
      const isSelf = targetUserId === m.userId
      const precheckRole = await findTargetRole(m.leagueId, targetUserId)
      if (!canRemoveMember({ actorRole: m.role, targetRole: precheckRole, isSelf })) {
        throw forbidden()
      }
      const outcome = await runInTransaction(db, async (tx) => {
        await lockLeagueEconomyExclusive(tx, m.leagueId)
        const { actorRole, targetRole } = await lockPair(tx, m, targetUserId)
        if (!canRemoveMember({ actorRole, targetRole, isSelf })) throw forbidden()
        const detached = await detachMember(tx, m, targetUserId, 'member_removed')
        await insertAuditEntry(tx, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId,
          action: 'member.removed',
          metadata: { role: targetRole, removedCards: detached.removal.removedCardIds.length },
        })
        return detached
      })
      await afterDetach(m.leagueId, outcome)
    },

    async leaveLeague(m) {
      if (!canLeaveLeague(m.role)) {
        throw new AppError('LEAVE_NOT_ALLOWED', 409, 'The owner must transfer the league first')
      }
      const outcome = await runInTransaction(db, async (tx) => {
        await lockLeagueEconomyExclusive(tx, m.leagueId)
        const [own] = await lockMemberships(tx, m.leagueId, [m.userId])
        if (own === undefined) throw notFound()
        if (!canLeaveLeague(own.role)) {
          throw new AppError('LEAVE_NOT_ALLOWED', 409, 'The owner must transfer the league first')
        }
        const detached = await detachMember(tx, m, m.userId, 'member_left')
        await insertAuditEntry(tx, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId: m.userId,
          action: 'member.left',
          metadata: { role: own.role, removedCards: detached.removal.removedCardIds.length },
        })
        return detached
      })
      await afterDetach(m.leagueId, outcome)
    },

    async transferOwnership(m, targetUserId) {
      const isSelf = targetUserId === m.userId
      const precheckRole = await findTargetRole(m.leagueId, targetUserId)
      if (!canTransferOwnership({ actorRole: m.role, targetRole: precheckRole, isSelf })) {
        throw forbidden()
      }
      await runInTransaction(db, async (tx) => {
        const { actorRole, targetRole } = await lockPair(tx, m, targetUserId)
        if (!canTransferOwnership({ actorRole, targetRole, isSelf })) throw forbidden()
        await transferOwnership(tx, {
          leagueId: m.leagueId,
          fromUserId: m.userId,
          toUserId: targetUserId,
        })
        await insertAuditEntry(tx, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId,
          action: 'league.ownership_transferred',
          metadata: { from: m.userId, to: targetUserId },
        })
      })
    },
  }
}
