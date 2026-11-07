import type { Database } from '@storix/db'
import type { MeResponse } from '@storix/shared'
import type { AuthSession } from '../../auth/auth.gateway'
import { listLeaguesForUser } from '../leagues/leagues.repository'
import { findUserHomeLeague } from '../users/users.repository'

export interface MeService {
  getMe(session: AuthSession): Promise<MeResponse>
}

/** Builds the service describing the current user. */
export function createMeService(db: Database): MeService {
  return {
    async getMe(session) {
      const [home, leagues] = await Promise.all([
        findUserHomeLeague(db, session.userId),
        listLeaguesForUser(db, session.userId),
      ])
      return {
        user: {
          id: session.userId,
          username: session.username,
          displayUsername: session.displayUsername,
        },
        homeLeagueId: home?.homeLeagueId ?? null,
        leagues,
      }
    },
  }
}
