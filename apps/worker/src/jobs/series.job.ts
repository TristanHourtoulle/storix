import type { PgBoss } from 'pg-boss'
import { SERIES_EVENT_PUSH_JOB, SERIES_ROLLOVER_JOB, SERIES_TICK_JOB } from '@storix/shared'
import type { SeriesService } from '../features/series/series.service'

const TICK_CRON = '*/10 * * * *'
const ROLLOVER_CRON = '5 0,2 * * 1'
const EVENT_PUSH_CRON = '* * * * *'
const SERIES_TIMEZONE = 'Europe/Paris'

/**
 * Schedules the series tick every 10 minutes and the weekly rollover on Monday Paris time: 00:05 opens the
 * new theme, 02:05 closes the past one once its 2 h grace window is over (the tick catches up otherwise).
 * Every minute, the start of each event is announced once.
 */
export async function registerSeriesJobs(boss: PgBoss, service: SeriesService): Promise<void> {
  await boss.createQueue(SERIES_TICK_JOB)
  await boss.createQueue(SERIES_ROLLOVER_JOB)
  await boss.schedule(SERIES_TICK_JOB, TICK_CRON, null, { tz: SERIES_TIMEZONE })
  await boss.createQueue(SERIES_EVENT_PUSH_JOB)
  await boss.schedule(SERIES_ROLLOVER_JOB, ROLLOVER_CRON, null, { tz: SERIES_TIMEZONE })
  await boss.schedule(SERIES_EVENT_PUSH_JOB, EVENT_PUSH_CRON, null, { tz: SERIES_TIMEZONE })
  await boss.work(SERIES_TICK_JOB, { batchSize: 1 }, async () => {
    await service.tick()
  })
  await boss.work(SERIES_ROLLOVER_JOB, { batchSize: 1 }, async () => {
    await service.rollover()
  })
  await boss.work(SERIES_EVENT_PUSH_JOB, { batchSize: 1 }, async () => {
    await service.announceStarts()
  })
}
