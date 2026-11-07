import { sql } from 'drizzle-orm'
import type { DbExecutor } from '../client'

function economyLockKey(leagueId: string) {
  return sql`hashtext(${'economy:' + leagueId})::bigint`
}

/**
 * Takes the league economy lock in shared mode until the transaction ends.
 * Lock order on every path: this lock first, then the moderation lock, then row locks.
 */
export async function lockLeagueEconomyShared(db: DbExecutor, leagueId: string): Promise<void> {
  await db.execute(sql`select pg_advisory_xact_lock_shared(${economyLockKey(leagueId)})`)
}

/**
 * Takes the league economy lock in exclusive mode until the transaction ends.
 * Lock order on every path: this lock first, then the moderation lock, then row locks.
 */
export async function lockLeagueEconomyExclusive(db: DbExecutor, leagueId: string): Promise<void> {
  await db.execute(sql`select pg_advisory_xact_lock(${economyLockKey(leagueId)})`)
}
