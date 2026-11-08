import type { Database } from '@storix/db'
import {
  canManageInvitations,
  hasRoleAtLeast,
  type LeagueDetail,
  type LeagueRole,
  type LeagueSummary,
} from '@storix/shared'
import { notFound } from '../../lib/errors'
import type { MediaSigner } from '../../lib/media-signer'
import { runInTransaction } from '../../lib/transaction'
import { insertAuditEntry } from '../audit/audit.repository'
import { findMembership, insertMember } from '../members/members.repository'
import { toPortraitView } from '../portraits/portrait-view'
import { findPortraitForOwner } from '../portraits/portraits.repository'
import { setHomeLeagueIfUnset } from '../users/users.repository'
import {
  countMembers,
  findLeagueById,
  insertLeague,
  lockLeagueById,
  updateLeagueName,
} from './leagues.repository'

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
  renameLeague(membership: Membership, name: string): Promise<LeagueDetail>
  getMembership(leagueId: string, userId: string): Promise<Membership | null>
}

/** Builds the leagues service. */
export function createLeaguesService(deps: { db: Database; signer: MediaSigner }): LeaguesService {
  const { db, signer } = deps

  const getLeagueDetail = async (
    leagueId: string,
    membership: Membership,
  ): Promise<LeagueDetail> => {
    const [league, memberCount, photo] = await Promise.all([
      findLeagueById(db, leagueId),
      countMembers(db, leagueId),
      findPortraitForOwner(db, { kind: 'league', ownerId: leagueId }),
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
      photo: photo === null ? null : toPortraitView(photo, signer),
    }
  }

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
        return { id: league.id, name: league.name, role: 'owner', memberCount: 1, photo: null }
      })
    },
    getLeagueDetail,
    async renameLeague(membership, name) {
      await runInTransaction(db, async (tx) => {
        const league = await lockLeagueById(tx, membership.leagueId)
        if (league === null) throw notFound()
        if (league.name === name) return
        await updateLeagueName(tx, membership.leagueId, name)
        await insertAuditEntry(tx, {
          leagueId: membership.leagueId,
          actorId: membership.userId,
          targetUserId: null,
          action: 'league.renamed',
          metadata: { from: league.name, to: name },
        })
      })
      return getLeagueDetail(membership.leagueId, membership)
    },
    async getMembership(leagueId, userId) {
      const record = await findMembership(db, leagueId, userId)
      return record === null ? null : { leagueId, userId, role: record.role }
    },
  }
}
