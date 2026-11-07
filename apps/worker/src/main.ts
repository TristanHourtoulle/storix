import { createDb } from '@storix/db'
import { MEDIA_PROCESS_JOB, MEDIA_SWEEP_JOB, type MediaProcessPayload } from '@storix/shared'
import { createObjectStorage } from '@storix/storage'
import { PgBoss } from 'pg-boss'
import { pino } from 'pino'
import { loadWorkerEnv } from './config/env'
import { configureImagePipeline, imagePipeline } from './features/media/image-pipeline'
import { createMediaProcessingService } from './features/media/media-processing.service'
import { createMediaSweepService } from './features/media/media-sweep.service'
import { registerMediaProcessJob } from './jobs/media-process.job'
import { registerMediaSweepJob } from './jobs/media-sweep.job'
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

  async function enqueueMediaProcess(payload: MediaProcessPayload): Promise<void> {
    await boss.send(MEDIA_PROCESS_JOB, payload, {
      singletonKey: payload.uploadId,
      retryLimit: 3,
      retryDelay: 15,
      retryBackoff: true,
    })
  }

  async function shutdown(signal: string): Promise<void> {
    logger.info({ signal }, 'Shutting down')
    await boss.stop({ graceful: true, timeout: STOP_TIMEOUT_MS })
    await database.close()
    process.exit(0)
  }

  process.once('SIGTERM', (signal) => void shutdown(signal))
  process.once('SIGINT', (signal) => void shutdown(signal))

  await boss.start()
  await boss.createQueue(MEDIA_PROCESS_JOB)
  await boss.createQueue(MEDIA_SWEEP_JOB)

  const processing = createMediaProcessingService({
    db: database.db,
    storage,
    pipeline: imagePipeline,
    clock,
    logger,
  })
  const sweep = createMediaSweepService({
    db: database.db,
    storage,
    clock,
    logger,
    enqueueMediaProcess,
  })
  await registerMediaProcessJob(boss, processing, logger, { concurrency: env.MEDIA_CONCURRENCY })
  await registerMediaSweepJob(boss, sweep)
  logger.info({ concurrency: env.MEDIA_CONCURRENCY }, 'Worker started')
}

try {
  await start()
} catch (error) {
  pino().fatal({ err: error }, 'Failed to start worker')
  process.exit(1)
}
