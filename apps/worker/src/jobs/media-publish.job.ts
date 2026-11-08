import type { JobWithMetadata, PgBoss } from 'pg-boss'
import { MEDIA_PUBLISH_JOB, mediaPublishPayloadSchema } from '@storix/shared'
import type { CardPublishService } from '../features/media/card-publish.service'
import type { WorkerLogger } from '../lib/logger'

/** Subscribes the card publish service to the media.publish queue, one job at a time to keep card numbers in stack order. */
export async function registerMediaPublishJob(
  boss: PgBoss,
  service: CardPublishService,
  logger: WorkerLogger,
): Promise<void> {
  await boss.work(
    MEDIA_PUBLISH_JOB,
    { batchSize: 1, localConcurrency: 1, includeMetadata: true },
    async (jobs: JobWithMetadata<unknown>[]) => {
      for (const job of jobs) {
        const payload = mediaPublishPayloadSchema.safeParse(job.data)
        if (!payload.success) {
          logger.error({ jobId: job.id }, 'Discarding media.publish job with an invalid payload')
          continue
        }
        await service.publishUpload(payload.data.uploadId, {
          isFinalAttempt: job.retryCount >= job.retryLimit,
        })
      }
    },
  )
}
