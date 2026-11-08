import type { Database, DbExecutor } from '@storix/db'
import {
  accountDeletionPlan,
  type AccountDeletionPreview,
  type DeleteAccountBody,
  type LeagueCardCount,
  type OwnedLeague,
  type PhotosChoice,
  type PortraitOwner,
} from '@storix/shared'
import type { ObjectStorage } from '@storix/storage'
import type { AuthGateway, AuthSession } from '../../auth/auth.gateway'
import type { JobQueue } from '../../jobs/job-queue'
import type { ErrorLogger } from '../../lib/error-logger'
import { AppError, isDeadlock, notFound } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import { insertAuditEntry } from '../audit/audit.repository'
import { deleteUploads, listOpenUploadKeys } from '../card-removal/card-removal.repository'
import type { CardRemoval } from '../card-removal/card-removal.service'
import { afterDetach, detachMember, type DetachOutcome } from '../members/members.service'
import { listOwnerPortraitKeys } from '../portraits/portrait-storage'
import {
  deletePortraitAndUpload,
  findPortraitForOwner,
  portraitKeysOf,
} from '../portraits/portraits.repository'
import {
  countAuthoredCardsByLeague,
  deleteLeague,
  deleteUserRow,
  listLeagueVariantKeys,
  listMembershipLeagueIds,
  listOwnedLeagues,
  lockAuthoredCards,
  lockLeagueEconomyExclusive,
  lockLeagueRows,
  lockOwnMemberships,
  lockUserRow,
  type AuthoredCardsInLeague,
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
  storage: ObjectStorage
  jobs: JobQueue
  logger: ErrorLogger
  clock: () => Date
}

interface DeletionOutcome {
  detached: { leagueId: string; outcome: DetachOutcome }[]
  objectKeys: string[]
  portraitOwners: PortraitOwner[]
}

class MembershipsChangedError extends Error {
  constructor() {
    super('Memberships changed while deleting the account')
    this.name = 'MembershipsChangedError'
  }
}

function deletionConflict(): AppError {
  return new AppError(
    'ACCOUNT_DELETION_CONFLICT',
    409,
    'Your leagues changed during the deletion, please retry',
  )
}

function isRetryable(error: unknown): boolean {
  return error instanceof MembershipsChangedError || isDeadlock(error)
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

function toLeagueCardCount(entry: AuthoredCardsInLeague): LeagueCardCount {
  return { leagueId: entry.leagueId, name: entry.name, cardCount: entry.cardCount }
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
  const { db, auth, cardRemoval, storage, jobs, logger, clock } = deps

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
   * then the user's membership rows, the open uploads and the owned league rows (blocking joins).
   * The user's remaining authored cards, then the user row, are locked last, right before the user delete, so moderation of those cards
   * (card row, then an audit row referencing the user) can never wait on the user row while this transaction waits on the same card rows.
   * Once every membership is detached, they are re-read under the user row lock: a join committed in between restarts the attempt.
   * The avatar portrait is read and deleted under the user row lock; a solo league's photo is read under its league row lock.
   */
  async function deleteInTx(
    tx: DbExecutor,
    session: AuthSession,
    lockedLeagueIds: readonly string[],
    photos: PhotosChoice,
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

    const plan = accountDeletionPlan(await listOwnedLeagues(tx, userId))
    if (plan.blocking.length > 0) throw ownershipTransferRequired(plan.blocking)
    const openUploads = await listOpenUploadKeys(tx, { userId })

    const deletedLeagueKeys = await mapInOrder(plan.solo, async (league) => {
      const variantKeys = await listLeagueVariantKeys(tx, league.leagueId)
      const photo = await findPortraitForOwner(
        tx,
        { kind: 'league', ownerId: league.leagueId },
        { lock: true },
      )
      const photoKeys = photo === null ? [] : portraitKeysOf(photo)
      const leftoverKeys = await deleteLeague(tx, league.leagueId)
      await insertAuditEntry(tx, {
        leagueId: null,
        actorId: userId,
        targetUserId: null,
        action: 'league.deleted',
        metadata: { leagueId: league.leagueId, name: league.name },
      })
      return [...variantKeys, ...photoKeys, ...leftoverKeys]
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
          photos,
        }),
      }),
    )

    await deleteUploads(
      tx,
      openUploads.map((upload) => upload.id),
    )
    await lockAuthoredCards(tx, userId)
    if (!(await lockUserRow(tx, userId))) throw notFound('Account not found')
    const avatar = await findPortraitForOwner(
      tx,
      { kind: 'avatar', ownerId: userId },
      { lock: true },
    )
    if (avatar !== null) await deletePortraitAndUpload(tx, avatar)
    if ((await lockOwnMemberships(tx, userId)).length > 0) throw new MembershipsChangedError()
    await insertAuditEntry(tx, {
      leagueId: null,
      actorId: null,
      targetUserId: null,
      action: 'account.deleted',
      metadata: {
        username: session.username,
        photos,
        keptCards: detached.reduce((sum, entry) => sum + entry.outcome.keptCardCount, 0),
      },
    })
    if ((await deleteUserRow(tx, userId)) === 0) throw notFound('Account not found')

    const objectKeys = [
      ...openUploads.map((upload) => upload.objectKey),
      ...deletedLeagueKeys.flat(),
      ...detached.flatMap((entry) => entry.outcome.uploadKeys),
      ...(avatar === null ? [] : portraitKeysOf(avatar)),
    ]
    return {
      detached,
      objectKeys: [...new Set(objectKeys)],
      portraitOwners: [
        { kind: 'avatar', ownerId: userId },
        ...plan.solo.map((league): PortraitOwner => ({ kind: 'league', ownerId: league.leagueId })),
      ],
    }
  }

  async function runDeletion(
    session: AuthSession,
    photos: PhotosChoice,
    attempt: number,
  ): Promise<DeletionOutcome> {
    const lockedLeagueIds = await listMembershipLeagueIds(db, session.userId)
    try {
      return await runInTransaction(db, (tx) => deleteInTx(tx, session, lockedLeagueIds, photos))
    } catch (error) {
      if (!isRetryable(error)) throw error
      if (attempt >= MAX_ATTEMPTS) throw deletionConflict()
      return runDeletion(session, photos, attempt + 1)
    }
  }

  async function listLeftoverPortraitKeys(
    session: AuthSession,
    owners: readonly PortraitOwner[],
  ): Promise<string[]> {
    try {
      return await listOwnerPortraitKeys(storage, owners)
    } catch (error) {
      logger.error(
        { err: error, userId: session.userId },
        'Failed to list the portrait files of a deleted account',
      )
      return []
    }
  }

  async function afterDeletion(session: AuthSession, outcome: DeletionOutcome): Promise<void> {
    for (const { leagueId, outcome: detach } of outcome.detached) {
      await afterDetach({ cardRemoval, jobs, logger }, leagueId, { ...detach, uploadKeys: [] })
    }
    const leftovers = await listLeftoverPortraitKeys(session, outcome.portraitOwners)
    const objectKeys = [...new Set([...outcome.objectKeys, ...leftovers])]
    if (objectKeys.length === 0) return
    try {
      await jobs.enqueueStorageDelete(objectKeys)
    } catch (error) {
      logger.error(
        { err: error, userId: session.userId, keys: objectKeys.length },
        'Failed to enqueue deleted account files deletion',
      )
    }
  }

  return {
    async getDeletionPreview(session) {
      const [owned, authored] = await Promise.all([
        listOwnedLeagues(db, session.userId),
        countAuthoredCardsByLeague(db, session.userId),
      ])
      const plan = accountDeletionPlan(owned)
      const soloIds = new Set(plan.solo.map((league) => league.leagueId))
      return {
        blocking: plan.blocking.map(toLeagueRef),
        solo: plan.solo.map(toLeagueRef),
        authoredCardCount: authored.reduce((sum, entry) => sum + entry.cardCount, 0),
        choiceLeagues: authored
          .filter((entry) => entry.isMember && !soloIds.has(entry.leagueId))
          .map(toLeagueCardCount),
        anonymizedLeagues: authored.filter((entry) => !entry.isMember).map(toLeagueCardCount),
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
      const outcome = await runDeletion(session, body.photos, 1)
      await afterDeletion(session, outcome)
    },
  }
}
