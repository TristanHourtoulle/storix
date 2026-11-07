import type { Database } from '@storix/db'
import { createAuth, type Auth } from './auth/auth'
import type { Env } from './config/env'
import { createHealthService, type HealthService } from './features/health/health.service'

export interface AppDeps {
  env: Env
  db: Database
  auth: Auth
  clock: () => Date
}

export interface Services {
  health: HealthService
}

/** Wires the runtime dependencies for the given environment and database. */
export function createAppDeps(env: Env, db: Database): AppDeps {
  return { env, db, auth: createAuth({ db, env }), clock: () => new Date() }
}

/** Builds every feature service from the app dependencies. */
export function buildServices(deps: AppDeps): Services {
  return { health: createHealthService(deps.db) }
}
