import { createDb } from '@storix/db'
import { buildApp } from './app'
import { loadEnv } from './config/env'
import { createAppDeps } from './deps'

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
  app.log.fatal({ err: error }, 'Failed to start server')
  await database.close()
  process.exit(1)
}
