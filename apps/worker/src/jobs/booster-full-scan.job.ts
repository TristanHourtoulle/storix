import type { PgBoss } from 'pg-boss'
import {
  BOOSTER_FULL_SCAN_JOB,
  BOOSTER_FULL_SCAN_QUEUE_OPTIONS,
  BOOSTER_FULL_SCAN_RETRY_OPTIONS,
} from '@storix/shared'
import type { BoosterFullService } from '../features/push/booster-full.service'
import type { WorkerLogger } from '../lib/logger'

const SCAN_CRON = '* * * * *'

/** Creates the booster-full scan queue with the exclusive policy and no retries, recreating an empty queue left with another policy. */
export async function ensureBoosterFullScanQueue(
  boss: PgBoss,
  logger: WorkerLogger,
): Promise<void> {
  const expected = BOOSTER_FULL_SCAN_QUEUE_OPTIONS.policy
  await boss.createQueue(BOOSTER_FULL_SCAN_JOB, BOOSTER_FULL_SCAN_QUEUE_OPTIONS)
  const queue = await boss.getQueue(BOOSTER_FULL_SCAN_JOB)
  if (queue?.policy !== expected) {
    const jobs = await boss.findJobs(BOOSTER_FULL_SCAN_JOB, {})
    if (jobs.length > 0) {
      logger.error(
        { policy: queue?.policy, expected, jobs: jobs.length },
        'Booster-full scan queue has the wrong policy and holds jobs; overlapping scans are not dropped',
      )
    } else {
      await boss.deleteQueue(BOOSTER_FULL_SCAN_JOB)
      await boss.createQueue(BOOSTER_FULL_SCAN_JOB, BOOSTER_FULL_SCAN_QUEUE_OPTIONS)
      logger.warn(
        { from: queue?.policy, to: expected },
        'Recreated the empty booster-full scan queue',
      )
    }
  }
  await boss.updateQueue(BOOSTER_FULL_SCAN_JOB, BOOSTER_FULL_SCAN_RETRY_OPTIONS)
}

/** Schedules the booster-full scan every minute and subscribes its service. */
export async function registerBoosterFullScanJob(
  boss: PgBoss,
  service: BoosterFullService,
): Promise<void> {
  await boss.schedule(BOOSTER_FULL_SCAN_JOB, SCAN_CRON, null)
  await boss.work(BOOSTER_FULL_SCAN_JOB, { batchSize: 1 }, async ([job]) => {
    await service.scan(job?.signal)
  })
}

/** Removes the scan schedule left by an earlier keyed run, without creating the queue. */
export async function unscheduleBoosterFullScan(boss: PgBoss): Promise<void> {
  if ((await boss.getQueue(BOOSTER_FULL_SCAN_JOB)) === null) return
  await boss.unschedule(BOOSTER_FULL_SCAN_JOB)
}
