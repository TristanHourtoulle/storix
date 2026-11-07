import type { Job, PgBoss } from 'pg-boss'
import { RARITY_RECOMPUTE_JOB, rarityRecomputePayloadSchema } from '@storix/shared'
import type { RarityRecomputeService } from '../features/rarity/rarity-recompute.service'
import type { WorkerLogger } from '../lib/logger'

/** Subscribes the rarity service to the rarity.recompute queue. */
export async function registerRarityRecomputeJob(
  boss: PgBoss,
  service: RarityRecomputeService,
  logger: WorkerLogger,
): Promise<void> {
  await boss.work(RARITY_RECOMPUTE_JOB, { batchSize: 1 }, async (jobs: Job<unknown>[]) => {
    for (const job of jobs) {
      const payload = rarityRecomputePayloadSchema.safeParse(job.data)
      if (!payload.success) {
        logger.error({ jobId: job.id }, 'Discarding rarity.recompute job with an invalid payload')
        continue
      }
      await service.recomputeLeague(payload.data.leagueId)
    }
  })
}
