import type { PgBoss } from 'pg-boss'
import { SERIES_ROLLOVER_JOB, SERIES_TICK_JOB } from '@storix/shared'
import type { SeriesService } from '../features/series/series.service'

const TICK_CRON = '*/10 * * * *'
const ROLLOVER_CRON = '5 0 * * 1'
const SERIES_TIMEZONE = 'Europe/Paris'

/** Schedules the series tick every 10 minutes and the weekly theme rollover on Monday 00:05 Paris time. */
export async function registerSeriesJobs(boss: PgBoss, service: SeriesService): Promise<void> {
  await boss.createQueue(SERIES_TICK_JOB)
  await boss.createQueue(SERIES_ROLLOVER_JOB)
  await boss.schedule(SERIES_TICK_JOB, TICK_CRON, null, { tz: SERIES_TIMEZONE })
  await boss.schedule(SERIES_ROLLOVER_JOB, ROLLOVER_CRON, null, { tz: SERIES_TIMEZONE })
  await boss.work(SERIES_TICK_JOB, { batchSize: 1 }, async () => {
    await service.tick()
  })
  await boss.work(SERIES_ROLLOVER_JOB, { batchSize: 1 }, async () => {
    await service.rollover()
  })
}
