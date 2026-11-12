import type { Database } from '@storix/db'
import type { MeResponse } from '@storix/shared'
import type { AuthSession } from '../../auth/auth.gateway'
import { AppError, notFound } from '../../lib/errors'
import type { MediaSigner } from '../../lib/media-signer'
import { runInTransaction } from '../../lib/transaction'
import { insertAuditEntry } from '../audit/audit.repository'
import { findMemberLooks } from '../cosmetics/cosmetics.repository'
import { toLeagueSummary } from '../leagues/league-views'
import { listLeaguesForUser } from '../leagues/leagues.repository'
import { toPortraitView } from '../portraits/portrait-view'
import { findPortraitForOwner } from '../portraits/portraits.repository'
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
export function createMeService(deps: {
  db: Database
  clock: () => Date
  signer: MediaSigner
}): MeService {
  const { db, clock, signer } = deps

  const describe = async (session: AuthSession, displayUsername: string): Promise<MeResponse> => {
    const [home, leagues, avatar, looks] = await Promise.all([
      findUserHomeLeague(db, session.userId),
      listLeaguesForUser(db, session.userId),
      findPortraitForOwner(db, { kind: 'avatar', ownerId: session.userId }),
      findMemberLooks(db, [session.userId]),
    ])
    return {
      user: { id: session.userId, username: session.username, displayUsername },
      homeLeagueId: home?.homeLeagueId ?? null,
      leagues: leagues.map((row) => toLeagueSummary(row, signer)),
      avatar: avatar === null ? null : toPortraitView(avatar, signer),
      avatarFrame: looks.get(session.userId)?.avatarFrame ?? null,
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
