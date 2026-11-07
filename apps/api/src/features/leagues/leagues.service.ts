import type { Database } from '@storix/db'
import {
  canManageInvitations,
  hasRoleAtLeast,
  type LeagueDetail,
  type LeagueRole,
  type LeagueSummary,
} from '@storix/shared'
import { notFound } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import { insertAuditEntry } from '../audit/audit.repository'
import { findMembership, insertMember } from '../members/members.repository'
import { setHomeLeagueIfUnset } from '../users/users.repository'
import { countMembers, findLeagueById, insertLeague } from './leagues.repository'

export interface Membership {
  leagueId: string
  userId: string
  role: LeagueRole
}

export interface CreateLeagueOptions {
  setHomeLeague?: boolean
  source?: string
}

export interface LeaguesService {
  createLeague(userId: string, name: string, options?: CreateLeagueOptions): Promise<LeagueSummary>
  getLeagueDetail(leagueId: string, membership: Membership): Promise<LeagueDetail>
  getMembership(leagueId: string, userId: string): Promise<Membership | null>
}

/** Builds the leagues service. */
export function createLeaguesService(db: Database): LeaguesService {
  return {
    createLeague(userId, name, options = {}) {
      return runInTransaction(db, async (tx) => {
        const league = await insertLeague(tx, name)
        await insertMember(tx, { leagueId: league.id, userId, role: 'owner' })
        if (options.setHomeLeague === true) await setHomeLeagueIfUnset(tx, userId, league.id)
        await insertAuditEntry(tx, {
          leagueId: league.id,
          actorId: userId,
          targetUserId: null,
          action: 'league.created',
          metadata: {
            name: league.name,
            ...(options.source === undefined ? {} : { source: options.source }),
          },
        })
        return { id: league.id, name: league.name, role: 'owner', memberCount: 1 }
      })
    },
    async getLeagueDetail(leagueId, membership) {
      const [league, memberCount] = await Promise.all([
        findLeagueById(db, leagueId),
        countMembers(db, leagueId),
      ])
      if (league === null) throw notFound()
      return {
        id: league.id,
        name: league.name,
        memberCount,
        myRole: membership.role,
        permissions: {
          canManageInvitations: canManageInvitations(membership.role),
          canManageMembers: hasRoleAtLeast(membership.role, 'admin'),
        },
      }
    },
    async getMembership(leagueId, userId) {
      const record = await findMembership(db, leagueId, userId)
      return record === null ? null : { leagueId, userId, role: record.role }
    },
  }
}
