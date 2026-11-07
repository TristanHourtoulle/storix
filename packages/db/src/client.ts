import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema/index'

export type Database = ReturnType<typeof createDrizzle>

export type DbExecutor = Database | Parameters<Parameters<Database['transaction']>[0]>[0]

function createDrizzle(pool: Pool) {
  return drizzle(pool, { schema })
}

/** Creates a Drizzle database bound to a new pg pool, with a close function. */
export function createDb(url: string): { db: Database; close(): Promise<void> } {
  const pool = new Pool({ connectionString: url })
  return { db: createDrizzle(pool), close: () => pool.end() }
}
