import type { PgBoss } from 'pg-boss'
import { MISSIONS_SETTLE_JOB } from '@storix/shared'
import type { MissionsSettleService } from '../features/missions/missions-settle.service'

const SETTLE_CRON = '5 5 * * *'
const SETTLE_TIMEZONE = 'Europe/Paris'

/** Schedules the daily mission settlement at 05:05 Paris time and subscribes its service. */
export async function registerMissionsSettleJob(
  boss: PgBoss,
  service: MissionsSettleService,
): Promise<void> {
  await boss.createQueue(MISSIONS_SETTLE_JOB)
  await boss.schedule(MISSIONS_SETTLE_JOB, SETTLE_CRON, null, { tz: SETTLE_TIMEZONE })
  await boss.work(MISSIONS_SETTLE_JOB, { batchSize: 1 }, async () => {
    await service.settleEndedPeriods()
  })
}
