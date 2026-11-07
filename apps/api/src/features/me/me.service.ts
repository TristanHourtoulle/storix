import type { Database } from '@storix/db'
import type { MeResponse } from '@storix/shared'
import type { AuthSession } from '../../auth/auth.gateway'
import { listLeaguesForUser } from '../leagues/leagues.repository'

export interface MeService {
  getMe(session: AuthSession): Promise<MeResponse>
}

/** Builds the service describing the current user. */
export function createMeService(db: Database): MeService {
  return {
    async getMe(session) {
      return {
        user: {
          id: session.userId,
          username: session.username,
          displayUsername: session.displayUsername,
        },
        leagues: await listLeaguesForUser(db, session.userId),
      }
    },
  }
}
