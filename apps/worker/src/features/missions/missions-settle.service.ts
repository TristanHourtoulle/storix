import type { Database } from '@storix/db'
import { missionDayKey, missionWeekKey, type MissionPeriod } from '@storix/shared'
import type { WorkerLogger } from '../../lib/logger'
import { claimMission, listUnclaimedMissions } from './missions.repository'

const SETTLE_LOOKBACK_DAYS = 14
const DAY_MS = 86_400_000

export interface MissionsSettleService {
  settleEndedPeriods(): Promise<{ checked: number; credited: number }>
}

interface Deps {
  db: Database
  clock: () => Date
  logger: WorkerLogger
}

/**
 * Creates the use case crediting completed but unclaimed missions once their period has ended.
 * Every ended period of the last two weeks is covered, so a missed run is caught up; idempotent.
 */
export function createMissionsSettleService({ db, clock, logger }: Deps): MissionsSettleService {
  async function settle(
    period: MissionPeriod,
    fromKey: string,
    beforeKey: string,
  ): Promise<{ checked: number; credited: number }> {
    const rows = await listUnclaimedMissions(db, { period, fromKey, beforeKey })
    const credited = await rows.reduce<Promise<number>>(async (pending, row) => {
      const done = await pending
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
        return outcome.status === 'claimed' ? done + 1 : done
      } catch (error) {
        logger.warn({ err: error, missionId: row.id }, 'Mission settlement failed')
        return done
      }
    }, Promise.resolve(0))
    return { checked: rows.length, credited }
  }

  return {
    async settleEndedPeriods() {
      const now = clock()
      const fromKey = missionDayKey(new Date(now.getTime() - SETTLE_LOOKBACK_DAYS * DAY_MS))
      const day = await settle('day', fromKey, missionDayKey(now))
      const week = await settle('week', fromKey, missionWeekKey(now))
      const total = { checked: day.checked + week.checked, credited: day.credited + week.credited }
      logger.info(total, 'Missions settled')
      return total
    },
  }
}
