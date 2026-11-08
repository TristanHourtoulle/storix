import type { JobWithMetadata, PgBoss } from 'pg-boss'
import { STORAGE_DELETE_JOB, storageDeletePayloadSchema } from '@storix/shared'
import type { StorageDeleteService } from '../features/storage/storage-delete.service'
import type { WorkerLogger } from '../lib/logger'

/** Subscribes the storage delete service to the storage.delete queue. */
export async function registerStorageDeleteJob(
  boss: PgBoss,
  service: StorageDeleteService,
  logger: WorkerLogger,
): Promise<void> {
  await boss.work(
    STORAGE_DELETE_JOB,
    { batchSize: 1, includeMetadata: true },
    async (jobs: JobWithMetadata<unknown>[]) => {
      for (const job of jobs) {
        const payload = storageDeletePayloadSchema.safeParse(job.data)
        if (!payload.success) {
          logger.error({ jobId: job.id }, 'Discarding storage.delete job with an invalid payload')
          continue
        }
        await service.deleteObjects(payload.data.keys, { requestedAt: job.createdOn })
      }
    },
  )
}
