/**
 * League advisory locks, all held until the transaction ends.
 * Lock order on every path: economy (when needed), then moderation, then rarity, then row locks.
 * The worker recompute takes economy shared, then rarity, then rows; it never takes the moderation lock.
 * @module
 */
import { sql } from 'drizzle-orm'
import type { DbExecutor } from '../client'

function leagueLockKey(scope: 'economy' | 'moderation' | 'rarity', leagueId: string) {
  return sql`hashtext(${scope + ':' + leagueId})::bigint`
}

/** Takes the league economy lock in shared mode. */
export async function lockLeagueEconomyShared(db: DbExecutor, leagueId: string): Promise<void> {
  await db.execute(sql`select pg_advisory_xact_lock_shared(${leagueLockKey('economy', leagueId)})`)
}

/** Takes the league economy lock in exclusive mode. */
export async function lockLeagueEconomyExclusive(db: DbExecutor, leagueId: string): Promise<void> {
  await db.execute(sql`select pg_advisory_xact_lock(${leagueLockKey('economy', leagueId)})`)
}

/** Serializes admin moderation of one league. */
export async function lockLeagueModeration(db: DbExecutor, leagueId: string): Promise<void> {
  await db.execute(sql`select pg_advisory_xact_lock(${leagueLockKey('moderation', leagueId)})`)
}

/** Serializes rarity writes of one league: recomputes, pins and bounds. */
export async function lockLeagueRarity(db: DbExecutor, leagueId: string): Promise<void> {
  await db.execute(sql`select pg_advisory_xact_lock(${leagueLockKey('rarity', leagueId)})`)
}
