import { createDb } from '@storix/db'
import {
  MEDIA_PROCESS_JOB,
  MEDIA_SWEEP_JOB,
  RARITY_NIGHTLY_JOB,
  RARITY_RECOMPUTE_JOB,
  RARITY_RECOMPUTE_QUEUE_OPTIONS,
} from '@storix/shared'
import { assertStorageReachable, createObjectStorage } from '@storix/storage'
import { PgBoss } from 'pg-boss'
import { pino } from 'pino'
import { loadWorkerEnv } from './config/env'
import { configureImagePipeline, imagePipeline } from './features/media/image-pipeline'
import { createMediaProcessingService } from './features/media/media-processing.service'
import { createMediaSweepService } from './features/media/media-sweep.service'
import { createRarityRecomputeService } from './features/rarity/rarity-recompute.service'
import { registerMediaProcessJob } from './jobs/media-process.job'
import { createMediaQueue } from './jobs/media-queue'
import { registerMediaSweepJob } from './jobs/media-sweep.job'
import { registerRarityNightlyJob } from './jobs/rarity-nightly.job'
import { createRarityQueue } from './jobs/rarity-queue'
import { registerRarityRecomputeJob } from './jobs/rarity-recompute.job'
import { createLogger } from './lib/logger'

const STOP_TIMEOUT_MS = 30_000

async function start(): Promise<void> {
  const env = loadWorkerEnv(process.env)
  const logger = createLogger(env)
  configureImagePipeline()
  const database = createDb(env.DATABASE_URL)
  const storage = createObjectStorage(env)
  const clock = () => new Date()

  const boss = new PgBoss({ connectionString: env.DATABASE_URL, schema: 'pgboss' })
  boss.on('error', (error) => logger.error({ err: error }, 'pg-boss error'))

  const queue = createMediaQueue(boss)
  const rarityQueue = createRarityQueue(boss)

  async function shutdown(signal: string): Promise<void> {
    logger.info({ signal }, 'Shutting down')
    try {
      await boss.stop({ graceful: true, timeout: STOP_TIMEOUT_MS })
      await database.close()
    } catch (error) {
      logger.fatal({ err: error }, 'Shutdown failed')
      process.exit(1)
    }
    process.exit(0)
  }

  process.once('SIGTERM', (signal) => void shutdown(signal))
  process.once('SIGINT', (signal) => void shutdown(signal))

  await assertStorageReachable(storage)
  await boss.start()
  await boss.createQueue(MEDIA_PROCESS_JOB)
  await boss.createQueue(MEDIA_SWEEP_JOB)
  await boss.createQueue(RARITY_RECOMPUTE_JOB, RARITY_RECOMPUTE_QUEUE_OPTIONS)
  await boss.createQueue(RARITY_NIGHTLY_JOB)

  const processing = createMediaProcessingService({
    db: database.db,
    storage,
    pipeline: imagePipeline,
    clock,
    logger,
    rarity: rarityQueue,
  })
  const sweep = createMediaSweepService({
    db: database.db,
    storage,
    clock,
    logger,
    queue,
  })
  await registerMediaProcessJob(boss, processing, logger, { concurrency: env.MEDIA_CONCURRENCY })
  await registerMediaSweepJob(boss, sweep)
  const rarity = createRarityRecomputeService({
    db: database.db,
    queue: rarityQueue,
    clock,
    logger,
  })
  await registerRarityRecomputeJob(boss, rarity, logger)
  await registerRarityNightlyJob(boss, rarity)
  await boss.send(RARITY_NIGHTLY_JOB, null)
  logger.info({ concurrency: env.MEDIA_CONCURRENCY }, 'Worker started')
}

try {
  await start()
} catch (error) {
  pino().fatal({ err: error }, 'Failed to start worker')
  process.exit(1)
}
