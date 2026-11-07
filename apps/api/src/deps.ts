import type { Database } from '@storix/db'
import { createAuth } from './auth/auth'
import { createAuthGateway, type AuthGateway } from './auth/auth.gateway'
import type { Env } from './config/env'
import { createHealthService, type HealthService } from './features/health/health.service'
import {
  createInvitationsService,
  type InvitationsService,
} from './features/invitations/invitations.service'
import { createLeaguesService, type LeaguesService } from './features/leagues/leagues.service'
import { createMeService, type MeService } from './features/me/me.service'
import { createMembersService, type MembersService } from './features/members/members.service'

export interface AppDeps {
  env: Env
  db: Database
  auth: AuthGateway
  clock: () => Date
}

export interface Services {
  health: HealthService
  invitations: InvitationsService
  leagues: LeaguesService
  me: MeService
  members: MembersService
}

/** Wires the runtime dependencies for the given environment and database. */
export function createAppDeps(env: Env, db: Database): AppDeps {
  return { env, db, auth: createAuthGateway(createAuth({ db, env })), clock: () => new Date() }
}

/** Builds every feature service from the app dependencies. */
export function buildServices(deps: AppDeps): Services {
  return {
    health: createHealthService(deps.db),
    invitations: createInvitationsService({
      db: deps.db,
      auth: deps.auth,
      clock: deps.clock,
      appOrigin: deps.env.APP_ORIGIN,
    }),
    leagues: createLeaguesService(deps.db),
    me: createMeService(deps.db),
    members: createMembersService(deps.db),
  }
}
