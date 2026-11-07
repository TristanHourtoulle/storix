import type { Database, DbExecutor } from '@storix/db'

/** Runs the callback inside a database transaction and returns its result. */
export function runInTransaction<T>(db: Database, fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
  return db.transaction((tx) => fn(tx))
}
