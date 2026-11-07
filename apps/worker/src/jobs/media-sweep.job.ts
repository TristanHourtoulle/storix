import type { PgBoss } from 'pg-boss'
import { MEDIA_SWEEP_JOB } from '@storix/shared'
import type { MediaSweepService } from '../features/media/media-sweep.service'

const SWEEP_CRON = '*/15 * * * *'

/** Schedules the media sweep every 15 minutes and subscribes its service. */
export async function registerMediaSweepJob(
  boss: PgBoss,
  service: MediaSweepService,
): Promise<void> {
  await boss.schedule(MEDIA_SWEEP_JOB, SWEEP_CRON)
  await boss.work(MEDIA_SWEEP_JOB, { batchSize: 1 }, async () => {
    await service.sweep()
  })
}
