import type { JobWithMetadata, PgBoss } from 'pg-boss'
import { MEDIA_PROCESS_JOB, mediaProcessPayloadSchema } from '@storix/shared'
import type { MediaProcessingService } from '../features/media/media-processing.service'
import type { WorkerLogger } from '../lib/logger'

/** Subscribes the media processing service to the media.process queue. */
export async function registerMediaProcessJob(
  boss: PgBoss,
  service: MediaProcessingService,
  logger: WorkerLogger,
  options: { concurrency: number },
): Promise<void> {
  await boss.work(
    MEDIA_PROCESS_JOB,
    { batchSize: 1, localConcurrency: options.concurrency, includeMetadata: true },
    async (jobs: JobWithMetadata<unknown>[]) => {
      for (const job of jobs) {
        const payload = mediaProcessPayloadSchema.safeParse(job.data)
        if (!payload.success) {
          logger.error({ jobId: job.id }, 'Discarding media.process job with an invalid payload')
          continue
        }
        await service.processUpload(payload.data.uploadId, {
          isFinalAttempt: job.retryCount >= job.retryLimit,
        })
      }
    },
  )
}
