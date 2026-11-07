import { parseArgs } from 'node:util'
import { createDb } from '@storix/db'
import { pino } from 'pino'
import { createAuth } from '../auth/auth'
import { createAuthGateway } from '../auth/auth.gateway'
import { loadEnv } from '../config/env'
import { insertAuditEntry } from '../features/audit/audit.repository'
import { insertLeague } from '../features/leagues/leagues.repository'
import { insertMember } from '../features/members/members.repository'
import { findUserByUsername, setHomeLeagueIfUnset } from '../features/users/users.repository'
import { runInTransaction } from '../lib/transaction'

const logger = pino({ level: 'info' })

function readArgs(argv: string[]): { username: string; league: string } {
  const { values } = parseArgs({
    args: argv.filter((arg) => arg !== '--'),
    options: { username: { type: 'string' }, league: { type: 'string' } },
  })
  if (values.username === undefined || values.league === undefined) {
    throw new Error('Usage: bootstrap --username <name> --league <name>')
  }
  return { username: values.username, league: values.league }
}

async function main(): Promise<void> {
  const { username, league } = readArgs(process.argv.slice(2))
  const password = process.env['BOOTSTRAP_PASSWORD']
  if (password === undefined || password.length === 0) {
    throw new Error('BOOTSTRAP_PASSWORD environment variable is required')
  }
  const env = loadEnv(process.env)
  const database = createDb(env.DATABASE_URL)
  try {
    if ((await findUserByUsername(database.db, username)) !== null) {
      throw new Error(`Username "${username}" already exists`)
    }
    const gateway = createAuthGateway(createAuth({ db: database.db, env }))
    const { userId } = await gateway.createCredentialUser({ username, password })
    const created = await runInTransaction(database.db, async (tx) => {
      const record = await insertLeague(tx, league)
      await insertMember(tx, { leagueId: record.id, userId, role: 'owner' })
      await setHomeLeagueIfUnset(tx, userId, record.id)
      await insertAuditEntry(tx, {
        leagueId: record.id,
        actorId: userId,
        targetUserId: null,
        action: 'league.created',
        metadata: { name: record.name, source: 'bootstrap' },
      })
      return record
    })
    logger.info({ userId, leagueId: created.id }, 'Bootstrap complete')
  } finally {
    await database.close()
  }
}

try {
  await main()
} catch (error) {
  logger.fatal({ err: error }, 'Bootstrap failed')
  process.exitCode = 1
}
