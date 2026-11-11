import type { PgBoss } from 'pg-boss'
import {
  MOMENTS_TICK_JOB,
  MOMENTS_TICK_QUEUE_OPTIONS,
  MOMENTS_TICK_RETRY_OPTIONS,
} from '@storix/shared'
import type { MomentsTickService } from '../features/moments/moments-tick.service'

const TICK_CRON = '* * * * *'

/** Schedules the Moment tick every minute and subscribes its service. */
export async function registerMomentsTickJob(
  boss: PgBoss,
  service: MomentsTickService,
): Promise<void> {
  await boss.createQueue(MOMENTS_TICK_JOB, MOMENTS_TICK_QUEUE_OPTIONS)
  await boss.updateQueue(MOMENTS_TICK_JOB, MOMENTS_TICK_RETRY_OPTIONS)
  await boss.schedule(MOMENTS_TICK_JOB, TICK_CRON, null)
  await boss.work(MOMENTS_TICK_JOB, { batchSize: 1 }, async ([job]) => {
    await service.tick(job?.signal)
  })
}
