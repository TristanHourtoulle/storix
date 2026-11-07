import type { DbExecutor } from '@storix/db'
import { sql } from 'drizzle-orm'

/** Runs a trivial query to check database connectivity. */
export async function pingDatabase(db: DbExecutor): Promise<void> {
  await db.execute(sql`select 1`)
}
