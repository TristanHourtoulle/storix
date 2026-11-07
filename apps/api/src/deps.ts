import type { Database } from '@storix/db'
import { createObjectStorage, type ObjectStorage } from '@storix/storage'
import { createAuth } from './auth/auth'
import { createAuthGateway, type AuthGateway } from './auth/auth.gateway'
import type { Env } from './config/env'
import { createHealthService, type HealthService } from './features/health/health.service'
import {
  createInvitationsService,
  type InvitationsService,
} from './features/invitations/invitations.service'
import { createLeaguesService, type LeaguesService } from './features/leagues/leagues.service'
import { createMediaService, type MediaService } from './features/media/media.service'
import { createMeService, type MeService } from './features/me/me.service'
import { createMembersService, type MembersService } from './features/members/members.service'
import {
  createResetCodesService,
  type ResetCodesService,
} from './features/reset-codes/reset-codes.service'
import type { ErrorLogger } from './lib/error-logger'
import { createMediaSigner, type MediaSigner } from './lib/media-signer'

export interface AppDeps {
  env: Env
  db: Database
  auth: AuthGateway
  clock: () => Date
  storage: ObjectStorage
  mediaSigner: MediaSigner
}

export interface Services {
  health: HealthService
  invitations: InvitationsService
  leagues: LeaguesService
  me: MeService
  media: MediaService
  members: MembersService
  resetCodes: ResetCodesService
}

/** Wires the runtime dependencies for the given environment and database. */
export function createAppDeps(env: Env, db: Database): AppDeps {
  const clock = (): Date => new Date()
  return {
    env,
    db,
    auth: createAuthGateway(createAuth({ db, env })),
    clock,
    storage: createObjectStorage(env),
    mediaSigner: createMediaSigner(env.MEDIA_URL_SECRET, clock),
  }
}

/** Builds every feature service from the app dependencies. */
export function buildServices(deps: AppDeps, logger: ErrorLogger): Services {
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
    media: createMediaService({
      storage: deps.storage,
      signer: deps.mediaSigner,
      clock: deps.clock,
    }),
    members: createMembersService(deps.db),
    resetCodes: createResetCodesService({
      db: deps.db,
      auth: deps.auth,
      clock: deps.clock,
      logger,
    }),
  }
}
