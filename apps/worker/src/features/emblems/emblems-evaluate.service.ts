import type { Database } from '@storix/db'
import type { EmblemsQueue } from '../../jobs/emblems-queue'
import type { WorkerLogger } from '../../lib/logger'
import * as repository from './emblems.repository'

export interface EmblemsEvaluateService {
  evaluateLeague(leagueId: string): Promise<{ members: number; awarded: number }>
  enqueueAllLeagues(): Promise<number>
}

interface Deps {
  db: Database
  queue: EmblemsQueue
  clock: () => Date
  logger: WorkerLogger
}

/** Creates the use case awarding the emblems every member of a league has earned; idempotent. */
export function createEmblemsEvaluateService(deps: Deps): EmblemsEvaluateService {
  const { db, queue, clock, logger } = deps

  return {
    async evaluateLeague(leagueId) {
      const memberIds = await repository.listMemberIds(db, leagueId)
      let awarded = 0
      for (const userId of memberIds) {
        const earned = await repository.awardEarnedEmblems(db, { leagueId, userId, now: clock() })
        awarded += earned.length
      }
      logger.info({ leagueId, members: memberIds.length, awarded }, 'Emblems evaluated')
      return { members: memberIds.length, awarded }
    },

    async enqueueAllLeagues() {
      const leagueIds = await repository.listLeagueIds(db)
      for (const leagueId of leagueIds) await queue.enqueueEvaluate({ leagueId })
      logger.info({ leagues: leagueIds.length }, 'Emblem evaluation enqueued for every league')
      return leagueIds.length
    },
  }
}
