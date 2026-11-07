import { parseArgs } from 'node:util'
import { createDb } from '@storix/db'
import { leagueNameSchema, usernameSchema } from '@storix/shared'
import { pino, type Logger } from 'pino'
import { createAuth } from '../auth/auth'
import { createAuthGateway } from '../auth/auth.gateway'
import { loadEnv, type Env } from '../config/env'
import { createLeaguesService } from '../features/leagues/leagues.service'
import { findUserByUsername } from '../features/users/users.repository'
import { buildLoggerOptions } from '../lib/logger'

function readArgs(argv: string[]): { username: string; league: string } {
  const { values } = parseArgs({
    args: argv.filter((arg) => arg !== '--'),
    options: { username: { type: 'string' }, league: { type: 'string' } },
  })
  const username = usernameSchema.safeParse(values.username)
  const league = leagueNameSchema.safeParse(values.league)
  if (!username.success || !league.success) {
    const problems = [
      ...(username.success
        ? []
        : [`--username: ${username.error.issues[0]?.message ?? 'invalid'}`]),
      ...(league.success ? [] : [`--league: ${league.error.issues[0]?.message ?? 'invalid'}`]),
    ]
    throw new Error(
      `Usage: bootstrap --username <name> --league <name>. Invalid input (${problems.join('; ')})`,
    )
  }
  return { username: username.data, league: league.data }
}

async function main(env: Env, logger: Logger): Promise<void> {
  const { username, league } = readArgs(process.argv.slice(2))
  const password = process.env['BOOTSTRAP_PASSWORD']
  if (password === undefined || password.length === 0) {
    throw new Error('BOOTSTRAP_PASSWORD environment variable is required')
  }
  const database = createDb(env.DATABASE_URL)
  try {
    if ((await findUserByUsername(database.db, username)) !== null) {
      throw new Error(`Username "${username}" already exists`)
    }
    const gateway = createAuthGateway(createAuth({ db: database.db, env }))
    const { userId } = await gateway.createCredentialUser({ username, password })
    try {
      const created = await createLeaguesService(database.db).createLeague(userId, league, {
        setHomeLeague: true,
        source: 'bootstrap',
      })
      logger.info({ userId, leagueId: created.id }, 'Bootstrap complete')
    } catch (error) {
      try {
        await gateway.deleteUser(userId)
      } catch (cleanupError) {
        logger.error({ err: cleanupError, userId }, 'Bootstrap cleanup failed')
      }
      throw error
    }
  } finally {
    await database.close()
  }
}

const fallbackLogger = pino({ level: 'fatal' })

try {
  const env = loadEnv(process.env)
  await main(env, pino(buildLoggerOptions(env)))
} catch (error) {
  fallbackLogger.fatal({ err: error }, 'Bootstrap failed')
  process.exitCode = 1
}
