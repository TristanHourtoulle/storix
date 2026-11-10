import type { Database, DbExecutor } from '@storix/db'
import {
  evaluateEmblems,
  featuredFallback,
  type EmblemId,
  type MemberEmblems,
  type UnseenEmblems,
} from '@storix/shared'
import type { JobQueue } from '../../jobs/job-queue'
import type { ErrorLogger } from '../../lib/error-logger'
import { AppError, notFound } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import type { Membership } from '../leagues/leagues.service'
import { findMembership } from '../members/members.repository'
import {
  listEarnedEmblems,
  markEmblemsSeen,
  readEmblemStats,
  replaceFeaturedEmblems,
  type EarnedEmblemRow,
  type EmblemMember,
} from './emblems.repository'

export interface EmblemsService {
  listForMember(m: Membership, userId: string): Promise<MemberEmblems>
  listUnseen(m: Membership): Promise<UnseenEmblems>
  markSeen(m: Membership, emblemIds: readonly EmblemId[]): Promise<void>
  setFeatured(m: Membership, emblemIds: readonly EmblemId[]): Promise<MemberEmblems>
}

export interface EmblemsServiceDeps {
  db: Database
  clock: () => Date
}

/** Returns the featured emblems: the member's choice by rank, else the rarest earned ones. */
export function featuredEmblemIds(earned: readonly EarnedEmblemRow[]): EmblemId[] {
  const chosen = earned
    .filter((row) => row.featuredRank !== null)
    .toSorted((a, b) => (a.featuredRank ?? 0) - (b.featuredRank ?? 0))
    .map((row) => row.id)
  return chosen.length > 0 ? chosen : featuredFallback(earned)
}

async function buildMemberEmblems(db: DbExecutor, member: EmblemMember): Promise<MemberEmblems> {
  const [stats, earned] = await Promise.all([
    readEmblemStats(db, member),
    listEarnedEmblems(db, member),
  ])
  const earnedById = new Map(earned.map((row) => [row.id, row]))
  const emblems = evaluateEmblems(stats).map((emblem) => {
    const row = earnedById.get(emblem.id)
    return {
      id: emblem.id,
      progress: row === undefined ? emblem.progress : emblem.target,
      target: emblem.target,
      isEarned: row !== undefined,
      earnedAt: row?.earnedAt.toISOString() ?? null,
      featuredRank: row?.featuredRank ?? null,
    }
  })
  return { emblems, featured: featuredEmblemIds(earned), earnedCount: earned.length }
}

export interface EmblemAwards {
  /** Schedules the emblem evaluation of members after their action committed; failures are logged, never thrown. */
  request(members: readonly EmblemMember[]): Promise<void>
}

/** Builds the emblem award trigger: evaluation runs in the worker so actions never pay for the stats query. */
export function createEmblemAwards(deps: { jobs: JobQueue; logger: ErrorLogger }): EmblemAwards {
  return {
    async request(members) {
      for (const { leagueId, userId } of members) {
        try {
          await deps.jobs.enqueueEmblemsEvaluate({ leagueId, userId })
        } catch (error) {
          deps.logger.error({ err: error, leagueId, userId }, 'Failed to enqueue emblem evaluation')
        }
      }
    },
  }
}

/** Awaits a committed action, then schedules the emblem evaluation of the given members. */
export async function awardAfter<T>(
  awards: EmblemAwards,
  members: readonly EmblemMember[],
  action: Promise<T>,
): Promise<T> {
  const result = await action
  await awards.request(members)
  return result
}

/** Builds the service exposing members' emblem progress, the unlock queue and featured choices. */
export function createEmblemsService({ db, clock }: EmblemsServiceDeps): EmblemsService {
  return {
    async listForMember(m, userId) {
      const membership = await findMembership(db, m.leagueId, userId)
      if (membership === null) throw notFound('Member not found')
      return buildMemberEmblems(db, { leagueId: m.leagueId, userId })
    },

    async listUnseen(m) {
      const earned = await listEarnedEmblems(db, m)
      return {
        emblems: earned
          .filter((row) => row.seenAt === null)
          .map((row) => ({ id: row.id, earnedAt: row.earnedAt.toISOString() })),
      }
    },

    markSeen: (m, emblemIds) => markEmblemsSeen(db, { ...m, emblemIds, now: clock() }),

    setFeatured: (m, emblemIds) =>
      runInTransaction(db, async (tx) => {
        const earned = new Set((await listEarnedEmblems(tx, m)).map((row) => row.id))
        if (emblemIds.some((id) => !earned.has(id))) {
          throw new AppError('EMBLEM_NOT_EARNED', 409, 'Only earned emblems can be featured')
        }
        await replaceFeaturedEmblems(tx, { ...m, emblemIds })
        return buildMemberEmblems(tx, m)
      }),
  }
}
