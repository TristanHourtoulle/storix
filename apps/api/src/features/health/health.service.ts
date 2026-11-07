import type { Database } from '@storix/db'
import { AppError } from '../../lib/errors'
import { pingDatabase } from './health.repository'

export interface HealthStatus {
  status: 'ok'
  db: 'ok'
}

export interface HealthService {
  check(): Promise<HealthStatus>
}

/** Builds the health service checking database connectivity. */
export function createHealthService(db: Database): HealthService {
  return {
    async check() {
      try {
        await pingDatabase(db)
      } catch (error) {
        throw new AppError('INTERNAL_ERROR', 503, 'Database unavailable', undefined, {
          cause: error,
        })
      }
      return { status: 'ok', db: 'ok' }
    },
  }
}
