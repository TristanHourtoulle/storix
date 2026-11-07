import { resolve } from 'node:path'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'
import { pino } from 'pino'
import { z } from 'zod'

const migrateEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  MIGRATIONS_DIR: z.string().min(1).default('packages/db/drizzle'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
})

const fallbackLogger = pino({ level: 'fatal' })

try {
  const env = migrateEnvSchema.parse(process.env)
  const logger = pino({ level: env.LOG_LEVEL })
  const migrationsFolder = resolve(process.cwd(), env.MIGRATIONS_DIR)
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL })
  try {
    logger.info({ migrationsFolder }, 'Applying migrations')
    await migrate(drizzle(pool), { migrationsFolder })
    logger.info('Migrations are up to date')
  } finally {
    await pool.end()
  }
} catch (error) {
  fallbackLogger.fatal({ err: error }, 'Migration failed')
  process.exitCode = 1
}
