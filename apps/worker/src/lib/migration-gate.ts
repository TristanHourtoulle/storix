import type { WorkerLogger } from './logger'

export interface MigrationGateOptions {
  expected: number
  countApplied: () => Promise<number>
  logger: WorkerLogger
  intervalMs?: number
  timeoutMs?: number
  sleep?: (ms: number) => Promise<void>
  now?: () => number
}

const DEFAULT_INTERVAL_MS = 5_000
const DEFAULT_TIMEOUT_MS = 3 * 60_000

export class MigrationGateTimeoutError extends Error {
  constructor(applied: number, expected: number) {
    super(`Database has ${applied} of ${expected} migrations applied`)
    this.name = 'MigrationGateTimeoutError'
  }
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Waits until the database has at least the bundled number of migrations applied (the API pre-deploy runs them).
 * Polls every `intervalMs` and throws after `timeoutMs`, so the process exits and the platform restarts it.
 * The worker never runs migrations itself: two concurrent Drizzle migrators would race.
 */
export async function waitForMigrations(options: MigrationGateOptions): Promise<void> {
  const {
    expected,
    countApplied,
    logger,
    intervalMs = DEFAULT_INTERVAL_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    sleep = defaultSleep,
    now = Date.now,
  } = options
  const deadline = now() + timeoutMs
  for (;;) {
    const applied = await countApplied()
    if (applied >= expected) {
      logger.info({ applied, expected }, 'Database migrations are up to date')
      return
    }
    if (now() >= deadline) throw new MigrationGateTimeoutError(applied, expected)
    logger.warn({ applied, expected }, 'Waiting for database migrations')
    await sleep(intervalMs)
  }
}
