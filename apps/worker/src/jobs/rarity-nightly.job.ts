import type { PgBoss } from 'pg-boss'
import { RARITY_NIGHTLY_JOB } from '@storix/shared'
import type { RarityRecomputeService } from '../features/rarity/rarity-recompute.service'

const NIGHTLY_CRON = '0 3 * * *'
const NIGHTLY_TIMEZONE = 'Europe/Paris'

/** Schedules the nightly rarity refresh at 03:00 Paris time and subscribes its service. */
export async function registerRarityNightlyJob(
  boss: PgBoss,
  service: RarityRecomputeService,
): Promise<void> {
  await boss.schedule(RARITY_NIGHTLY_JOB, NIGHTLY_CRON, null, { tz: NIGHTLY_TIMEZONE })
  await boss.work(RARITY_NIGHTLY_JOB, { batchSize: 1 }, async () => {
    await service.enqueueAllLeagues()
  })
}
