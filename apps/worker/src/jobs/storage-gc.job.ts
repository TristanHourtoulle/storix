import type { PgBoss } from 'pg-boss'
import { STORAGE_GC_JOB } from '@storix/shared'
import type { StorageGcService } from '../features/storage/storage-gc.service'

const GC_QUEUE_OPTIONS = { policy: 'short' } as const
const GC_CRON = '0 4 * * 0'
const GC_TIMEZONE = 'Europe/Paris'

/** Schedules the orphan collection every Sunday at 04:00 Paris time and subscribes its service. */
export async function registerStorageGcJob(boss: PgBoss, service: StorageGcService): Promise<void> {
  await boss.schedule(STORAGE_GC_JOB, GC_CRON, null, { tz: GC_TIMEZONE })
  await boss.work(STORAGE_GC_JOB, { batchSize: 1 }, async () => {
    await service.collect()
  })
}

/** Creates the GC queue with a short policy, recreating a queue that predates it. */
export async function createStorageGcQueue(boss: PgBoss): Promise<void> {
  const existing = await boss.getQueue(STORAGE_GC_JOB)
  if (existing !== null && existing.policy !== GC_QUEUE_OPTIONS.policy) {
    await boss.deleteQueue(STORAGE_GC_JOB)
  }
  await boss.createQueue(STORAGE_GC_JOB, GC_QUEUE_OPTIONS)
}
