import type { Database } from '@storix/db'
import { createObjectStorage, type ObjectStorage } from '@storix/storage'
import { createAuth } from './auth/auth'
import { createAuthGateway, type AuthGateway } from './auth/auth.gateway'
import type { Env } from './config/env'
import { createAccountService, type AccountService } from './features/account/account.service'
import { createCardRemoval, type CardRemoval } from './features/card-removal/card-removal.service'
import { createBoostersService, type BoostersService } from './features/boosters/boosters.service'
import { createCardsService, type CardsService } from './features/cards/cards.service'
import { createCopiesService, type CopiesService } from './features/copies/copies.service'
import { createHealthService, type HealthService } from './features/health/health.service'
import {
  createInvitationsService,
  type InvitationsService,
} from './features/invitations/invitations.service'
import {
  createLeagueSettingsService,
  type LeagueSettingsService,
} from './features/league-settings/league-settings.service'
import { createLeaguesService, type LeaguesService } from './features/leagues/leagues.service'
import { createMediaService, type MediaService } from './features/media/media.service'
import { createMeService, type MeService } from './features/me/me.service'
import {
  createModerationService,
  type ModerationService,
} from './features/moderation/moderation.service'
import { createMembersService, type MembersService } from './features/members/members.service'
import {
  createReactionsService,
  type ReactionsService,
} from './features/reactions/reactions.service'
import { createRemovalsService, type RemovalsService } from './features/removals/removals.service'
import {
  createResetCodesService,
  type ResetCodesService,
} from './features/reset-codes/reset-codes.service'
import { createUploadsService, type UploadsService } from './features/uploads/uploads.service'
import { createWalletsService, type WalletsService } from './features/wallets/wallets.service'
import {
  createWithdrawalsService,
  type WithdrawalsService,
} from './features/withdrawals/withdrawals.service'
import type { JobQueue } from './jobs/job-queue'
import type { ErrorLogger } from './lib/error-logger'
import { createMediaSigner, type MediaSigner } from './lib/media-signer'

export interface AppDeps {
  env: Env
  db: Database
  auth: AuthGateway
  clock: () => Date
  storage: ObjectStorage
  mediaSigner: MediaSigner
  jobs: JobQueue
}

export interface Services {
  account: AccountService
  boosters: BoostersService
  cardRemoval: CardRemoval
  cards: CardsService
  copies: CopiesService
  health: HealthService
  invitations: InvitationsService
  leagues: LeaguesService
  leagueSettings: LeagueSettingsService
  me: MeService
  media: MediaService
  members: MembersService
  moderation: ModerationService
  reactions: ReactionsService
  removals: RemovalsService
  resetCodes: ResetCodesService
  uploads: UploadsService
  wallets: WalletsService
  withdrawals: WithdrawalsService
}

/** Wires the runtime dependencies for the given environment, database and job queue. */
export function createAppDeps(env: Env, db: Database, jobs: JobQueue): AppDeps {
  const clock = (): Date => new Date()
  return {
    env,
    db,
    auth: createAuthGateway(createAuth({ db, env })),
    clock,
    storage: createObjectStorage(env),
    mediaSigner: createMediaSigner(env.MEDIA_URL_SECRET, clock),
    jobs,
  }
}

/** Builds every feature service from the app dependencies. */
export function buildServices(deps: AppDeps, logger: ErrorLogger): Services {
  const cardRemoval = createCardRemoval({ jobs: deps.jobs, logger })
  return {
    account: createAccountService({
      db: deps.db,
      auth: deps.auth,
      cardRemoval,
      jobs: deps.jobs,
      logger,
      clock: deps.clock,
    }),
    boosters: createBoostersService({
      db: deps.db,
      signer: deps.mediaSigner,
      clock: deps.clock,
    }),
    cardRemoval,
    cards: createCardsService({ db: deps.db, signer: deps.mediaSigner, clock: deps.clock }),
    copies: createCopiesService({ db: deps.db, clock: deps.clock }),
    health: createHealthService(deps.db),
    invitations: createInvitationsService({
      db: deps.db,
      auth: deps.auth,
      clock: deps.clock,
      appOrigin: deps.env.APP_ORIGIN,
    }),
    leagues: createLeaguesService(deps.db),
    leagueSettings: createLeagueSettingsService({
      db: deps.db,
      jobs: deps.jobs,
      clock: deps.clock,
      logger,
    }),
    me: createMeService(deps.db),
    media: createMediaService({
      storage: deps.storage,
      signer: deps.mediaSigner,
      clock: deps.clock,
    }),
    members: createMembersService({ db: deps.db, cardRemoval, jobs: deps.jobs, logger }),
    moderation: createModerationService({
      db: deps.db,
      signer: deps.mediaSigner,
      clock: deps.clock,
      jobs: deps.jobs,
      cardRemoval,
      logger,
    }),
    reactions: createReactionsService({ db: deps.db }),
    removals: createRemovalsService({ db: deps.db, clock: deps.clock }),
    resetCodes: createResetCodesService({
      db: deps.db,
      auth: deps.auth,
      clock: deps.clock,
      logger,
    }),
    uploads: createUploadsService({
      db: deps.db,
      storage: deps.storage,
      jobs: deps.jobs,
      clock: deps.clock,
    }),
    wallets: createWalletsService({ db: deps.db, clock: deps.clock }),
    withdrawals: createWithdrawalsService({
      db: deps.db,
      signer: deps.mediaSigner,
      cardRemoval,
    }),
  }
}
