import type { Database, DbExecutor } from '@storix/db'
import {
  canChangeRole,
  canIssueResetCode,
  canLeaveLeague,
  canRemoveMember,
  canTransferOwnership,
  type LeagueRole,
  type MemberSummary,
  type PhotosChoice,
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
import {
  emptyRemovalOutcome,
  type CardRemoval,
  type RemovalOutcome,
} from '../card-removal/card-removal.service'
import { findOwnerIds } from '../leagues/leagues.repository'
import type { Membership } from '../leagues/leagues.service'
import { deleteUnusedCodesFromHomeLeague } from '../reset-codes/reset-codes.repository'
import { lockLeagueEconomyExclusive } from '../wallets/wallets.repository'
import {
  clearMemberTraces,
  deleteMember,
  deleteMemberCopies,
  findMembership,
  listMembers,
  lockMemberships,
  transferOwnership,
  updateMemberRole,
  type MemberLock,
  type MemberRow,
} from './members.repository'

const ASSIGNABLE_ROLES = ['admin', 'member'] as const satisfies readonly LeagueRole[]

export type DetachReason = 'member_removed' | 'member_left' | 'account_deleted'

export interface DetachOutcome {
  removal: RemovalOutcome
  keptCardCount: number
  uploadKeys: string[]
}

export interface DetachInput {
  leagueId: string
  actorId: string
  targetUserId: string
  reason: DetachReason
  photos: PhotosChoice
}

export interface AfterDetachDeps {
  cardRemoval: CardRemoval
  jobs: JobQueue
  logger: ErrorLogger
}

export interface MembersService {
  listMembers(m: Membership): Promise<MemberSummary[]>
  changeRole(m: Membership, targetUserId: string, nextRole: LeagueRole): Promise<void>
  removeMember(m: Membership, targetUserId: string, photos: PhotosChoice): Promise<void>
  leaveLeague(m: Membership, photos: PhotosChoice): Promise<void>
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
    username: m.role === 'admin' || m.role === 'owner' ? row.username : null,
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

function leaveNotAllowed(): AppError {
  return new AppError('LEAVE_NOT_ALLOWED', 409, 'The owner must transfer the league first')
}

function roleOf(locks: readonly MemberLock[], userId: string): LeagueRole | null {
  return locks.find((lock) => lock.userId === userId)?.role ?? null
}

/**
 * Detaches a member from a league inside the caller's transaction, which must already hold the exclusive league economy lock and the membership row lock.
 * With `photos: 'delete'` the authored cards are removed and their owners compensated; with `'keep'` they stay in the league.
 */
export async function detachMember(
  tx: DbExecutor,
  cardRemoval: CardRemoval,
  input: DetachInput,
): Promise<DetachOutcome> {
  const { leagueId, actorId, targetUserId, reason, photos } = input
  const openUploads = await listOpenUploadKeys(tx, { leagueId, userId: targetUserId })
  await deleteMemberCopies(tx, { leagueId, userId: targetUserId })
  const authoredCardIds = await findCardIdsByAuthor(tx, { leagueId, authorId: targetUserId })
  const removal =
    photos === 'delete'
      ? await cardRemoval.removeInTx(tx, { leagueId, cardIds: authoredCardIds, reason, actorId })
      : emptyRemovalOutcome()
  await deleteUploads(
    tx,
    openUploads.map((upload) => upload.id),
  )
  await clearMemberTraces(tx, { leagueId, userId: targetUserId })
  await deleteUnusedCodesFromHomeLeague(tx, { userId: targetUserId, leagueId })
  if ((await deleteMember(tx, leagueId, targetUserId)) === 0) {
    throw notFound('Member not found')
  }
  return {
    removal,
    keptCardCount: photos === 'keep' ? authoredCardIds.length : 0,
    uploadKeys: openUploads.map((upload) => upload.objectKey),
  }
}

/** Deletes the departed member's files and recomputes rarity after commit; failures are logged, never thrown. */
export async function afterDetach(
  deps: AfterDetachDeps,
  leagueId: string,
  outcome: DetachOutcome,
): Promise<void> {
  const { cardRemoval, jobs, logger } = deps
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

/** Builds the members service. */
export function createMembersService(deps: MembersServiceDeps): MembersService {
  const { db, cardRemoval } = deps

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
      const isSelf = targetUserId === m.userId
      const precheckRole = await findTargetRole(m.leagueId, targetUserId)
      if (!canChangeRole({ actorRole: m.role, targetRole: precheckRole, nextRole, isSelf })) {
        throw forbidden()
      }
      await runInTransaction(db, async (tx) => {
        const { actorRole, targetRole } = await lockPair(tx, m, targetUserId)
        if (!canChangeRole({ actorRole, targetRole, nextRole, isSelf })) throw forbidden()
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

    async removeMember(m, targetUserId, photos) {
      const isSelf = targetUserId === m.userId
      const precheckRole = await findTargetRole(m.leagueId, targetUserId)
      if (!canRemoveMember({ actorRole: m.role, targetRole: precheckRole, isSelf })) {
        throw forbidden()
      }
      const outcome = await runInTransaction(db, async (tx) => {
        await lockLeagueEconomyExclusive(tx, m.leagueId)
        const { actorRole, targetRole } = await lockPair(tx, m, targetUserId)
        if (!canRemoveMember({ actorRole, targetRole, isSelf })) throw forbidden()
        const detached = await detachMember(tx, cardRemoval, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId,
          reason: 'member_removed',
          photos,
        })
        await insertAuditEntry(tx, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId,
          action: 'member.removed',
          metadata: {
            role: targetRole,
            photos,
            removedCards: detached.removal.removedCardIds.length,
            keptCards: detached.keptCardCount,
          },
        })
        return detached
      })
      await afterDetach(deps, m.leagueId, outcome)
    },

    async leaveLeague(m, photos) {
      if (!canLeaveLeague(m.role)) {
        throw leaveNotAllowed()
      }
      const outcome = await runInTransaction(db, async (tx) => {
        await lockLeagueEconomyExclusive(tx, m.leagueId)
        const [own] = await lockMemberships(tx, m.leagueId, [m.userId])
        if (own === undefined) throw notFound()
        if (!canLeaveLeague(own.role)) {
          throw leaveNotAllowed()
        }
        const detached = await detachMember(tx, cardRemoval, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId: m.userId,
          reason: 'member_left',
          photos,
        })
        await insertAuditEntry(tx, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId: m.userId,
          action: 'member.left',
          metadata: {
            role: own.role,
            photos,
            removedCards: detached.removal.removedCardIds.length,
            keptCards: detached.keptCardCount,
          },
        })
        return detached
      })
      await afterDetach(deps, m.leagueId, outcome)
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
