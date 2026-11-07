import type { Database } from '@storix/db'
import type { MeResponse } from '@storix/shared'
import type { AuthSession } from '../../auth/auth.gateway'
import { AppError, notFound } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import { insertAuditEntry } from '../audit/audit.repository'
import { listLeaguesForUser } from '../leagues/leagues.repository'
import {
  findUserByUsername,
  findUserHomeLeague,
  lockUserDisplayName,
  updateUserDisplayName,
} from '../users/users.repository'

export interface MeService {
  getMe(session: AuthSession): Promise<MeResponse>
  updateDisplayName(session: AuthSession, displayName: string): Promise<MeResponse>
}

/** Builds the service describing the current user and changing their display name. */
export function createMeService(deps: { db: Database; clock: () => Date }): MeService {
  const { db, clock } = deps

  const describe = async (session: AuthSession, displayUsername: string): Promise<MeResponse> => {
    const [home, leagues] = await Promise.all([
      findUserHomeLeague(db, session.userId),
      listLeaguesForUser(db, session.userId),
    ])
    return {
      user: { id: session.userId, username: session.username, displayUsername },
      homeLeagueId: home?.homeLeagueId ?? null,
      leagues,
    }
  }

  return {
    getMe: (session) => describe(session, session.displayUsername),

    async updateDisplayName(session, displayName) {
      const homonym = await findUserByUsername(db, displayName)
      if (homonym !== null && homonym.id !== session.userId) {
        throw new AppError(
          'DISPLAY_NAME_RESERVED',
          400,
          "This display name is another member's login username",
        )
      }
      await runInTransaction(db, async (tx) => {
        const current = await lockUserDisplayName(tx, session.userId)
        if (current === null) throw notFound()
        const from = current.displayUsername ?? current.username
        if (from === displayName) return
        await updateUserDisplayName(tx, { userId: session.userId, displayName, now: clock() })
        await insertAuditEntry(tx, {
          leagueId: null,
          actorId: session.userId,
          targetUserId: session.userId,
          action: 'account.display_name_changed',
          metadata: { from, to: displayName },
        })
      })
      return describe(session, displayName)
    },
  }
}
