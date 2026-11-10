import type { Database, DbExecutor } from '@storix/db'
import {
  isNewerRelease,
  RELEASE_NOTES,
  unseenReleaseIds,
  type WhatsNewState,
  type WhatsNewTargets,
} from '@storix/shared'
import type { AuthSession } from '../../auth/auth.gateway'
import { AppError, unauthenticated } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import type { Membership } from '../leagues/leagues.service'
import { findMemberSince } from '../users/users.repository'
import {
  findShowcaseCardId,
  findStackCardId,
  findWhatsNewRead,
  lockWhatsNewRead,
  upsertWhatsNewRead,
  type WhatsNewRead,
} from './whats-new.repository'

export interface WhatsNewService {
  getState(session: AuthSession): Promise<WhatsNewState>
  markSeen(session: AuthSession, releaseId: string): Promise<WhatsNewState>
  getTargets(membership: Membership): Promise<WhatsNewTargets>
}

export interface WhatsNewServiceDeps {
  db: Database
  clock: () => Date
}

async function stateOf(
  db: DbExecutor,
  userId: string,
  read: WhatsNewRead | null,
): Promise<WhatsNewState> {
  const memberSince = await findMemberSince(db, userId)
  if (memberSince === null) throw unauthenticated()
  return {
    seenReleaseId: read?.releaseId ?? null,
    unseenReleaseIds: unseenReleaseIds(RELEASE_NOTES, {
      seenReleaseId: read?.releaseId ?? null,
      seenAt: read?.seenAt ?? null,
      memberSince,
    }),
  }
}

/** Builds the service tracking which feature releases each member has seen. */
export function createWhatsNewService({ db, clock }: WhatsNewServiceDeps): WhatsNewService {
  return {
    async getState(session) {
      return stateOf(db, session.userId, await findWhatsNewRead(db, session.userId))
    },

    markSeen: (session, releaseId) => {
      if (!RELEASE_NOTES.some((release) => release.id === releaseId)) {
        throw new AppError('VALIDATION_FAILED', 400, 'Unknown release')
      }
      return runInTransaction(db, async (tx) => {
        const { userId } = session
        const current = await lockWhatsNewRead(tx, userId)
        if (!isNewerRelease(RELEASE_NOTES, releaseId, current?.releaseId ?? null)) {
          return stateOf(tx, userId, current)
        }
        const now = clock()
        await upsertWhatsNewRead(tx, { userId, releaseId, now })
        return stateOf(tx, userId, { releaseId, seenAt: now })
      })
    },

    async getTargets({ leagueId, userId }) {
      const [showcaseCardId, stackCardId] = await Promise.all([
        findShowcaseCardId(db, { leagueId, userId }),
        findStackCardId(db, { leagueId, userId }),
      ])
      return { showcaseCardId, stackCardId }
    },
  }
}
