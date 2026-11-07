import { sql } from 'drizzle-orm'
import journal from '../../drizzle/meta/_journal.json' with { type: 'json' }
import type { DbExecutor } from '../client'

/** Number of migrations bundled with this build, read from the Drizzle journal at build time. */
export const MIGRATION_JOURNAL_ENTRY_COUNT: number = journal.entries.length

/** Counts the migrations recorded in `drizzle.__drizzle_migrations`; 0 when the table does not exist yet. */
export async function countAppliedMigrations(db: DbExecutor): Promise<number> {
  const result = await db.execute<{ applied: number }>(sql`
    select case
      when to_regclass('drizzle.__drizzle_migrations') is null then 0
      else (select count(*)::int from drizzle.__drizzle_migrations)
    end as applied
  `)
  return Number(result.rows[0]?.applied ?? 0)
}
