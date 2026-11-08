import type { PgBoss } from 'pg-boss'
import { MEDIA_PUBLISH_JOB, MEDIA_PUBLISH_QUEUE_OPTIONS } from '@storix/shared'
import type { WorkerLogger } from '../lib/logger'

/** Creates the media.publish queue with the exclusive policy, recreating an empty queue left with another policy. */
export async function ensureMediaPublishQueue(boss: PgBoss, logger: WorkerLogger): Promise<void> {
  const expected = MEDIA_PUBLISH_QUEUE_OPTIONS.policy
  await boss.createQueue(MEDIA_PUBLISH_JOB, MEDIA_PUBLISH_QUEUE_OPTIONS)
  const queue = await boss.getQueue(MEDIA_PUBLISH_JOB)
  if (queue?.policy === expected) return
  const jobs = await boss.findJobs(MEDIA_PUBLISH_JOB, {})
  if (jobs.length > 0) {
    logger.error(
      { policy: queue?.policy, expected, jobs: jobs.length },
      'media.publish queue has the wrong policy and holds jobs; duplicates are not coalesced',
    )
    return
  }
  await boss.deleteQueue(MEDIA_PUBLISH_JOB)
  await boss.createQueue(MEDIA_PUBLISH_JOB, MEDIA_PUBLISH_QUEUE_OPTIONS)
  logger.warn({ from: queue?.policy, to: expected }, 'Recreated the empty media.publish queue')
}
