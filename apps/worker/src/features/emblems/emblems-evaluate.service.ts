import type { Database } from '@storix/db'
import type { EmblemsQueue } from '../../jobs/emblems-queue'
import type { WorkerLogger } from '../../lib/logger'
import * as repository from './emblems.repository'

export interface EmblemsEvaluateService {
  evaluateMember(leagueId: string, userId: string): Promise<number>
  evaluateLeague(leagueId: string): Promise<{ members: number; awarded: number }>
  enqueueUnevaluatedMembers(): Promise<number>
}

interface Deps {
  db: Database
  queue: EmblemsQueue
  clock: () => Date
  logger: WorkerLogger
}

/** Creates the use case awarding the emblems league members have earned; idempotent. */
export function createEmblemsEvaluateService(deps: Deps): EmblemsEvaluateService {
  const { db, queue, clock, logger } = deps

  async function evaluateMember(leagueId: string, userId: string): Promise<number> {
    if (!(await repository.isMember(db, { leagueId, userId }))) return 0
    const now = clock()
    const awarded = await db.transaction(async (tx) => {
      const earned = await repository.awardEarnedEmblems(tx, { leagueId, userId, now })
      await repository.markEmblemsEvaluated(tx, { leagueId, userId, now })
      return earned.length
    })
    logger.info({ leagueId, userId, awarded }, 'Member emblems evaluated')
    return awarded
  }

  return {
    evaluateMember,

    async evaluateLeague(leagueId) {
      const memberIds = await repository.listMemberIds(db, leagueId)
      let awarded = 0
      for (const userId of memberIds) {
        try {
          awarded += await evaluateMember(leagueId, userId)
        } catch (error) {
          logger.warn({ err: error, leagueId, userId }, 'Skipping member emblem evaluation')
        }
      }
      logger.info({ leagueId, members: memberIds.length, awarded }, 'Emblems evaluated')
      return { members: memberIds.length, awarded }
    },

    async enqueueUnevaluatedMembers() {
      const members = await repository.listUnevaluatedMembers(db)
      for (const member of members) await queue.enqueueEvaluate(member)
      if (members.length > 0) {
        logger.info({ members: members.length }, 'Emblem evaluation enqueued for new members')
      }
      return members.length
    },
  }
}
