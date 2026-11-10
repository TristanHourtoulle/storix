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
  lockUserWhatsNew,
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

function stateOf(read: WhatsNewRead | null, memberSince: Date): WhatsNewState {
  return {
    seenReleaseId: read?.releaseId ?? null,
    unseenReleaseIds: unseenReleaseIds(RELEASE_NOTES, {
      seenReleaseId: read?.releaseId ?? null,
      seenAt: read?.seenAt ?? null,
      memberSince,
    }),
  }
}

async function requireMemberSince(db: DbExecutor, userId: string): Promise<Date> {
  const memberSince = await findMemberSince(db, userId)
  if (memberSince === null) throw unauthenticated()
  return memberSince
}

/** Builds the service tracking which feature releases each member has seen. */
export function createWhatsNewService({ db, clock }: WhatsNewServiceDeps): WhatsNewService {
  return {
    async getState(session) {
      const [memberSince, read] = await Promise.all([
        requireMemberSince(db, session.userId),
        findWhatsNewRead(db, session.userId),
      ])
      return stateOf(read, memberSince)
    },

    markSeen: (session, releaseId) => {
      if (!RELEASE_NOTES.some((release) => release.id === releaseId)) {
        throw new AppError('VALIDATION_FAILED', 400, 'Unknown release')
      }
      return runInTransaction(db, async (tx) => {
        const { userId } = session
        await lockUserWhatsNew(tx, userId)
        const memberSince = await requireMemberSince(tx, userId)
        const current = await findWhatsNewRead(tx, userId)
        if (!isNewerRelease(RELEASE_NOTES, releaseId, current?.releaseId ?? null)) {
          return stateOf(current, memberSince)
        }
        const now = clock()
        await upsertWhatsNewRead(tx, { userId, releaseId, now })
        return stateOf({ releaseId, seenAt: now }, memberSince)
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
