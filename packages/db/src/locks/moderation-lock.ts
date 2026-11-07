import { sql } from 'drizzle-orm'
import type { DbExecutor } from '../client'

/**
 * Serializes admin moderation of one league until the transaction ends.
 * Lock order on every path: the economy lock (when needed), then this lock, then row locks.
 */
export async function lockLeagueModeration(db: DbExecutor, leagueId: string): Promise<void> {
  await db.execute(sql`select pg_advisory_xact_lock(hashtext(${'moderation:' + leagueId})::bigint)`)
}
