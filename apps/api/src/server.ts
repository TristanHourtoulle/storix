import { createDb } from '@storix/db'
import { assertStorageReachable } from '@storix/storage'
import { pino } from 'pino'
import { buildApp } from './app'
import { loadEnv } from './config/env'
import { createAppDeps } from './deps'
import { startJobQueue, type JobQueue } from './jobs/job-queue'
import { buildLoggerOptions } from './lib/logger'

async function start(): Promise<void> {
  const env = loadEnv(process.env)
  const database = createDb(env.DATABASE_URL)
  let jobs: JobQueue | null = null

  async function release(): Promise<void> {
    await jobs?.stop()
    await database.close()
  }

  try {
    const bootLogger = pino(buildLoggerOptions(env))
    jobs = await startJobQueue({ databaseUrl: env.DATABASE_URL, logger: bootLogger })
    const deps = createAppDeps(env, database.db, jobs)
    await assertStorageReachable(deps.storage)
    const app = await buildApp(deps)

    async function shutdown(signal: string): Promise<void> {
      app.log.info({ signal }, 'Shutting down')
      let exitCode = 0
      try {
        await app.close()
        await release()
      } catch (error) {
        exitCode = 1
        app.log.error({ err: error }, 'Shutdown failed')
      } finally {
        process.exit(exitCode)
      }
    }

    process.once('SIGTERM', (signal) => void shutdown(signal))
    process.once('SIGINT', (signal) => void shutdown(signal))

    await app.listen({ port: env.PORT, host: '0.0.0.0' })
  } catch (error) {
    await release()
    throw error
  }
}

try {
  await start()
} catch (error) {
  pino().fatal({ err: error }, 'Failed to start server')
  process.exit(1)
}
