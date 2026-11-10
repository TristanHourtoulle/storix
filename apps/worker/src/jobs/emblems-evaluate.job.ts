import type { Job, PgBoss } from 'pg-boss'
import { EMBLEMS_EVALUATE_JOB, emblemsEvaluatePayloadSchema } from '@storix/shared'
import type { EmblemsEvaluateService } from '../features/emblems/emblems-evaluate.service'
import type { WorkerLogger } from '../lib/logger'

/** Subscribes the emblem evaluation service to the emblems.evaluate-league queue. */
export async function registerEmblemsEvaluateJob(
  boss: PgBoss,
  service: EmblemsEvaluateService,
  logger: WorkerLogger,
): Promise<void> {
  await boss.work(EMBLEMS_EVALUATE_JOB, { batchSize: 1 }, async (jobs: Job<unknown>[]) => {
    for (const job of jobs) {
      const payload = emblemsEvaluatePayloadSchema.safeParse(job.data)
      if (!payload.success) {
        logger.error(
          { jobId: job.id },
          'Discarding emblems.evaluate-league job with an invalid payload',
        )
        continue
      }
      await service.evaluateLeague(payload.data.leagueId)
    }
  })
}
