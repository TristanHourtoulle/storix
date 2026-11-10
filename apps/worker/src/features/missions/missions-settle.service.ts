import type { Database } from '@storix/db'
import { missionDayKey, missionWeekKey, previousDayKey, previousWeekKey } from '@storix/shared'
import type { WorkerLogger } from '../../lib/logger'
import { claimMission, listUnclaimedMissions, type MissionPeriodRef } from './missions.repository'

export interface MissionsSettleService {
  settleEndedPeriods(): Promise<{ checked: number; credited: number }>
}

interface Deps {
  db: Database
  clock: () => Date
  logger: WorkerLogger
}

/** Creates the use case crediting completed but unclaimed missions once their period has ended; idempotent. */
export function createMissionsSettleService({ db, clock, logger }: Deps): MissionsSettleService {
  async function settle(ref: MissionPeriodRef): Promise<{ checked: number; credited: number }> {
    const rows = await listUnclaimedMissions(db, ref)
    const results = await rows.reduce<Promise<number>>(async (pending, row) => {
      const credited = await pending
      try {
        const outcome = await db.transaction((tx) =>
          claimMission(tx, {
            leagueId: row.leagueId,
            userId: row.userId,
            missionRowId: row.id,
            now: clock(),
            isAuto: true,
          }),
        )
        return outcome.status === 'claimed' ? credited + 1 : credited
      } catch (error) {
        logger.warn({ err: error, missionId: row.id }, 'Mission settlement failed')
        return credited
      }
    }, Promise.resolve(0))
    return { checked: rows.length, credited: results }
  }

  return {
    async settleEndedPeriods() {
      const now = clock()
      const dayKey = missionDayKey(now)
      const day = await settle({ period: 'day', key: previousDayKey(dayKey) })
      const isNewWeek = missionWeekKey(now) === dayKey
      const week = isNewWeek
        ? await settle({ period: 'week', key: previousWeekKey(missionWeekKey(now)) })
        : { checked: 0, credited: 0 }
      const total = { checked: day.checked + week.checked, credited: day.credited + week.credited }
      logger.info(total, 'Missions settled')
      return total
    },
  }
}
