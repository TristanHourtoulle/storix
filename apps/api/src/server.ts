import { createDb } from '@storix/db'
import { pino } from 'pino'
import { buildApp } from './app'
import { loadEnv } from './config/env'
import { createAppDeps } from './deps'

async function start(): Promise<void> {
  const env = loadEnv(process.env)
  const database = createDb(env.DATABASE_URL)
  const app = await buildApp(createAppDeps(env, database.db))

  async function shutdown(signal: string): Promise<void> {
    app.log.info({ signal }, 'Shutting down')
    await app.close()
    await database.close()
    process.exit(0)
  }

  process.once('SIGTERM', (signal) => void shutdown(signal))
  process.once('SIGINT', (signal) => void shutdown(signal))

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
  } catch (error) {
    await database.close()
    throw error
  }
}

try {
  await start()
} catch (error) {
  pino().fatal({ err: error }, 'Failed to start server')
  process.exit(1)
}
