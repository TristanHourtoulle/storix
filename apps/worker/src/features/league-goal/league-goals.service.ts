import type { Database } from '@storix/db'
import { missionWeekKey, previousWeekKey } from '@storix/shared'
import type { WorkerLogger } from '../../lib/logger'
import {
  advanceGoal,
  closeGoal,
  ensureWeekGoal,
  goalProgress,
  listLeagueIds,
  listOpenGoals,
  type LeagueGoalRecord,
} from './league-goals.repository'

export interface LeagueGoalsService {
  tick(): Promise<number>
  closeAndOpenWeek(): Promise<{ closed: number; opened: number }>
}

interface Deps {
  db: Database
  clock: () => Date
  logger: WorkerLogger
}

/** Creates the use cases rewarding reached league goals and rolling the weekly goals over; idempotent. */
export function createLeagueGoalsService({ db, clock, logger }: Deps): LeagueGoalsService {
  async function eachGoal(
    goals: readonly LeagueGoalRecord[],
    run: (goal: LeagueGoalRecord) => Promise<void>,
  ): Promise<number> {
    return goals.reduce<Promise<number>>(async (pending, goal) => {
      const done = await pending
      try {
        await run(goal)
        return done + 1
      } catch (error) {
        logger.warn({ err: error, leagueId: goal.leagueId }, 'League goal update failed')
        return done
      }
    }, Promise.resolve(0))
  }

  return {
    async tick() {
      const now = clock()
      const goals = await listOpenGoals(db, missionWeekKey(now))
      const advanced = await eachGoal(goals, (goal) =>
        db.transaction(async (tx) => {
          await advanceGoal(tx, { goal, progress: await goalProgress(tx, goal), now })
        }),
      )
      logger.info({ goals: advanced }, 'League goals ticked')
      return advanced
    },

    async closeAndOpenWeek() {
      const now = clock()
      const weekKey = missionWeekKey(now)
      const previous = await listOpenGoals(db, previousWeekKey(weekKey))
      const closed = await eachGoal(previous, (goal) =>
        db.transaction(async (tx) => {
          const progress = await goalProgress(tx, goal)
          const current = await advanceGoal(tx, { goal, progress, now })
          await closeGoal(tx, { goal: current, progress, now })
        }),
      )
      const leagueIds = await listLeagueIds(db)
      const opened = await leagueIds.reduce<Promise<number>>(async (pending, leagueId) => {
        const count = await pending
        try {
          await db.transaction((tx) => ensureWeekGoal(tx, { leagueId, weekKey, now }))
          return count + 1
        } catch (error) {
          logger.warn({ err: error, leagueId }, 'League goal creation failed')
          return count
        }
      }, Promise.resolve(0))
      logger.info({ closed, opened }, 'League goals rolled over')
      return { closed, opened }
    },
  }
}
