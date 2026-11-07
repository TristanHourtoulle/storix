import type { Database, DbExecutor } from '@storix/db'
import {
  accountDeletionPlan,
  type AccountDeletionPreview,
  type DeleteAccountBody,
  type OwnedLeague,
} from '@storix/shared'
import type { AuthGateway, AuthSession } from '../../auth/auth.gateway'
import type { JobQueue } from '../../jobs/job-queue'
import type { ErrorLogger } from '../../lib/error-logger'
import { AppError, notFound } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import { insertAuditEntry } from '../audit/audit.repository'
import { deleteUploads, listOpenUploadKeys } from '../card-removal/card-removal.repository'
import type { CardRemoval, RemovalOutcome } from '../card-removal/card-removal.service'
import { afterDetach, detachMember, type DetachOutcome } from '../members/members.service'
import {
  countAuthoredCards,
  deleteLeague,
  deleteUserRow,
  listLeagueCardIds,
  listMembershipLeagueIds,
  listOwnedLeagues,
  lockLeagueEconomyExclusive,
  lockLeagueRows,
  lockOwnMemberships,
  lockUserRow,
} from './account.repository'

export const FRESH_SESSION_MS = 5 * 60_000

const MAX_ATTEMPTS = 3

export interface AccountService {
  getDeletionPreview(session: AuthSession): Promise<AccountDeletionPreview>
  deleteAccount(session: AuthSession, body: DeleteAccountBody): Promise<void>
}

export interface AccountServiceDeps {
  db: Database
  auth: AuthGateway
  cardRemoval: CardRemoval
  jobs: JobQueue
  logger: ErrorLogger
  clock: () => Date
}

interface DeletionOutcome {
  deletedLeagues: { leagueId: string; removal: RemovalOutcome }[]
  detached: { leagueId: string; outcome: DetachOutcome }[]
  objectKeys: string[]
}

class MembershipsChangedError extends Error {
  constructor() {
    super('Memberships changed while deleting the account')
    this.name = 'MembershipsChangedError'
  }
}

function toLeagueRef(league: OwnedLeague): { leagueId: string; name: string } {
  return { leagueId: league.leagueId, name: league.name }
}

function ownershipTransferRequired(blocking: readonly OwnedLeague[]): AppError {
  return new AppError(
    'OWNERSHIP_TRANSFER_REQUIRED',
    409,
    'Transfer the ownership of your leagues first',
    { leagues: blocking.map(toLeagueRef) },
  )
}

function reauthRequired(): AppError {
  return new AppError('REAUTH_REQUIRED', 403, 'Re-authentication required')
}

function mapInOrder<T, R>(items: readonly T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  return items.reduce<Promise<R[]>>(
    async (previous, item) => [...(await previous), await fn(item)],
    Promise.resolve([]),
  )
}

/** Builds the self-service account deletion use cases. */
export function createAccountService(deps: AccountServiceDeps): AccountService {
  const { db, auth, cardRemoval, jobs, logger, clock } = deps

  function isFresh(session: AuthSession): boolean {
    return clock().getTime() - session.sessionCreatedAt.getTime() <= FRESH_SESSION_MS
  }

  async function assertReauthenticated(session: AuthSession, password: string | undefined) {
    if (password !== undefined) {
      if (!(await auth.verifyPassword(session.userId, password))) throw reauthRequired()
      return
    }
    if (!isFresh(session)) throw reauthRequired()
  }

  /**
   * Deletes everything the user holds in one transaction.
   * Locks, in order: every economy lock in sorted league id order (so concurrent removals and other deletions never deadlock),
   * then the user's membership rows, the open uploads, the owned league rows (blocking joins), and the user row (blocking new references).
   */
  async function deleteInTx(
    tx: DbExecutor,
    session: AuthSession,
    lockedLeagueIds: readonly string[],
  ): Promise<DeletionOutcome> {
    const { userId } = session
    for (const leagueId of lockedLeagueIds) await lockLeagueEconomyExclusive(tx, leagueId)
    const memberships = await lockOwnMemberships(tx, userId)
    if (memberships.some((membership) => !lockedLeagueIds.includes(membership.leagueId))) {
      throw new MembershipsChangedError()
    }
    await listOpenUploadKeys(tx, { userId })
    await lockLeagueRows(
      tx,
      memberships.filter((membership) => membership.role === 'owner').map((m) => m.leagueId),
    )
    if (!(await lockUserRow(tx, userId))) throw notFound('Account not found')

    const plan = accountDeletionPlan(await listOwnedLeagues(tx, userId))
    if (plan.blocking.length > 0) throw ownershipTransferRequired(plan.blocking)
    const openUploads = await listOpenUploadKeys(tx, { userId })

    const deletedLeagues = await mapInOrder(plan.solo, async (league) => {
      const removal = await cardRemoval.removeInTx(tx, {
        leagueId: league.leagueId,
        cardIds: await listLeagueCardIds(tx, league.leagueId),
        reason: 'league_deleted',
        actorId: userId,
      })
      const leftoverKeys = await deleteLeague(tx, league.leagueId)
      await insertAuditEntry(tx, {
        leagueId: null,
        actorId: userId,
        targetUserId: null,
        action: 'league.deleted',
        metadata: { leagueId: league.leagueId, name: league.name },
      })
      return { leagueId: league.leagueId, removal, leftoverKeys }
    })

    const soloIds = new Set(plan.solo.map((league) => league.leagueId))
    const detached = await mapInOrder(
      memberships.filter((membership) => !soloIds.has(membership.leagueId)),
      async ({ leagueId }) => ({
        leagueId,
        outcome: await detachMember(tx, cardRemoval, {
          leagueId,
          actorId: userId,
          targetUserId: userId,
          reason: 'account_deleted',
        }),
      }),
    )

    await deleteUploads(
      tx,
      openUploads.map((upload) => upload.id),
    )
    await insertAuditEntry(tx, {
      leagueId: null,
      actorId: null,
      targetUserId: null,
      action: 'account.deleted',
      metadata: { username: session.username },
    })
    if ((await deleteUserRow(tx, userId)) === 0) throw notFound('Account not found')

    const objectKeys = [
      ...openUploads.map((upload) => upload.objectKey),
      ...deletedLeagues.flatMap((league) => [...league.removal.objectKeys, ...league.leftoverKeys]),
      ...detached.flatMap((entry) => entry.outcome.uploadKeys),
    ]
    return {
      deletedLeagues: deletedLeagues.map(({ leagueId, removal }) => ({ leagueId, removal })),
      detached,
      objectKeys: [...new Set(objectKeys)],
    }
  }

  async function runDeletion(session: AuthSession, attempt: number): Promise<DeletionOutcome> {
    const lockedLeagueIds = await listMembershipLeagueIds(db, session.userId)
    try {
      return await runInTransaction(db, (tx) => deleteInTx(tx, session, lockedLeagueIds))
    } catch (error) {
      if (error instanceof MembershipsChangedError && attempt < MAX_ATTEMPTS) {
        return runDeletion(session, attempt + 1)
      }
      throw error
    }
  }

  async function afterDeletion(session: AuthSession, outcome: DeletionOutcome): Promise<void> {
    for (const { leagueId, outcome: detach } of outcome.detached) {
      await afterDetach({ cardRemoval, jobs, logger }, leagueId, { ...detach, uploadKeys: [] })
    }
    if (outcome.objectKeys.length === 0) return
    try {
      await jobs.enqueueStorageDelete(outcome.objectKeys)
    } catch (error) {
      logger.error(
        { err: error, userId: session.userId, keys: outcome.objectKeys.length },
        'Failed to enqueue deleted account files deletion',
      )
    }
  }

  return {
    async getDeletionPreview(session) {
      const [owned, authoredCardCount] = await Promise.all([
        listOwnedLeagues(db, session.userId),
        countAuthoredCards(db, session.userId),
      ])
      const plan = accountDeletionPlan(owned)
      return {
        blocking: plan.blocking.map(toLeagueRef),
        solo: plan.solo.map(toLeagueRef),
        authoredCardCount,
        requiresPassword: !isFresh(session),
      }
    },

    async deleteAccount(session, body) {
      if (body.confirmUsername.toLowerCase() !== session.username.toLowerCase()) {
        throw new AppError('CONFIRMATION_MISMATCH', 400, 'The username does not match')
      }
      await assertReauthenticated(session, body.password)
      const precheck = accountDeletionPlan(await listOwnedLeagues(db, session.userId))
      if (precheck.blocking.length > 0) throw ownershipTransferRequired(precheck.blocking)
      const outcome = await runDeletion(session, 1)
      await afterDeletion(session, outcome)
    },
  }
}
