import { resolve } from 'node:path'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import Fastify, { type FastifyInstance } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { authRoutes } from './auth/auth.routes'
import { clientIpPolicy, rateLimitKeyGenerator } from './config/client-ip'
import { buildServices, type AppDeps } from './deps'
import { accountRoutes } from './features/account/account.routes'
import { auditRoutes } from './features/audit/audit.routes'
import { boostersRoutes } from './features/boosters/boosters.routes'
import { cardsRoutes } from './features/cards/cards.routes'
import { copiesRoutes } from './features/copies/copies.routes'
import { charmsRoutes } from './features/charms/charms.routes'
import { cosmeticsRoutes } from './features/cosmetics/cosmetics.routes'
import { emblemsRoutes } from './features/emblems/emblems.routes'
import { healthRoutes } from './features/health/health.routes'
import { invitationsRoutes } from './features/invitations/invitations.routes'
import { leagueFeedRoutes } from './features/league-feed/league-feed.routes'
import { missionsRoutes } from './features/missions/missions.routes'
import { momentsRoutes } from './features/moments/moments.routes'
import { leagueGoalRoutes } from './features/league-goal/league-goal.routes'
import { standingsRoutes } from './features/standings/standings.routes'
import { leagueSettingsRoutes } from './features/league-settings/league-settings.routes'
import { leaguesRoutes } from './features/leagues/leagues.routes'
import { mediaRoutes } from './features/media/media.routes'
import { meRoutes } from './features/me/me.routes'
import { membersRoutes } from './features/members/members.routes'
import { moderationRoutes } from './features/moderation/moderation.routes'
import { portraitsRoutes } from './features/portraits/portraits.routes'
import { pushRoutes } from './features/push/push.routes'
import { reactionsRoutes } from './features/reactions/reactions.routes'
import { tagsRoutes } from './features/tags/tags.routes'
import { showcaseRoutes } from './features/showcase/showcase.routes'
import { removalsRoutes } from './features/removals/removals.routes'
import { resetCodesRoutes } from './features/reset-codes/reset-codes.routes'
import { uploadDraftsRoutes } from './features/uploads/upload-drafts.routes'
import { uploadsRoutes } from './features/uploads/uploads.routes'
import { walletsRoutes } from './features/wallets/wallets.routes'
import { whatsNewRoutes } from './features/whats-new/whats-new.routes'
import { onboardingRoutes } from './features/onboarding/onboarding.routes'
import { withdrawalsRoutes } from './features/withdrawals/withdrawals.routes'
import { registerErrorHandling } from './http/error-handler'
import { registerOriginCheck } from './http/origin-check'
import { registerStatic } from './http/static'
import { AppError } from './lib/errors'
import { buildLoggerOptions } from './lib/logger'

function defaultWebDistDir(): string {
  return resolve(process.cwd(), 'apps/web/dist')
}

/** Builds the Fastify application with security hooks and feature routes. */
export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { env } = deps
  const app = Fastify({
    logger: buildLoggerOptions(env),
    trustProxy: clientIpPolicy(env).trustProxy,
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  const isProduction = env.NODE_ENV === 'production'
  registerErrorHandling(app, { handleNotFound: !isProduction })

  await app.register(rateLimit, {
    global: false,
    keyGenerator: rateLimitKeyGenerator(env),
    errorResponseBuilder: (_request, context) =>
      new AppError('RATE_LIMITED', 429, 'Too many requests', { retryAfter: context.after }),
  })
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", deps.storage.uploadOrigin],
      },
    },
  })
  registerOriginCheck(app, env.APP_ORIGIN)

  app.addHook('onSend', async (request, reply, payload) => {
    if (request.url.startsWith('/api/')) reply.header('Cache-Control', 'no-store')
    return payload
  })

  app.decorate('authGateway', deps.auth)

  const services = buildServices(deps, app.log)
  app.decorate('services', services)
  await app.register(authRoutes(deps.auth, env.APP_ORIGIN))
  await app.register(healthRoutes(services.health), { prefix: '/api' })
  await app.register(meRoutes(services.me), { prefix: '/api' })
  await app.register(accountRoutes(services.account), { prefix: '/api' })
  await app.register(leaguesRoutes(services.leagues), { prefix: '/api' })
  await app.register(invitationsRoutes(services.invitations), { prefix: '/api' })
  await app.register(membersRoutes(services.members, services.memberProfiles), { prefix: '/api' })
  await app.register(resetCodesRoutes(services.resetCodes), { prefix: '/api' })
  await app.register(uploadDraftsRoutes(services.uploadDrafts), { prefix: '/api' })
  await app.register(uploadsRoutes(services.uploads), { prefix: '/api' })
  await app.register(cardsRoutes(services.cards), { prefix: '/api' })
  await app.register(walletsRoutes(services.wallets), { prefix: '/api' })
  await app.register(boostersRoutes(services.boosters, services.boosterHistory), { prefix: '/api' })
  await app.register(copiesRoutes(services.copies, services.stacks), { prefix: '/api' })
  await app.register(cosmeticsRoutes(services.cosmetics), { prefix: '/api' })
  await app.register(charmsRoutes(services.charms), { prefix: '/api' })
  await app.register(reactionsRoutes(services.reactions), { prefix: '/api' })
  await app.register(leagueFeedRoutes(services.leagueFeed), { prefix: '/api' })
  await app.register(missionsRoutes(services.missions), { prefix: '/api' })
  await app.register(momentsRoutes(services.moments), { prefix: '/api' })
  await app.register(leagueGoalRoutes(services.leagueGoal), { prefix: '/api' })
  await app.register(standingsRoutes(services.standings), { prefix: '/api' })
  await app.register(emblemsRoutes(services.emblems), { prefix: '/api' })
  await app.register(tagsRoutes(services.tags), { prefix: '/api' })
  await app.register(showcaseRoutes(services.showcase), { prefix: '/api' })
  await app.register(removalsRoutes(services.removals), { prefix: '/api' })
  await app.register(leagueSettingsRoutes(services.leagueSettings), { prefix: '/api' })
  await app.register(moderationRoutes(services.moderation), { prefix: '/api' })
  await app.register(auditRoutes(services.audit), { prefix: '/api' })
  await app.register(withdrawalsRoutes(services.withdrawals), { prefix: '/api' })
  await app.register(portraitsRoutes(services.portraits), { prefix: '/api' })
  await app.register(pushRoutes(services.push), { prefix: '/api' })
  await app.register(whatsNewRoutes(services.whatsNew), { prefix: '/api' })
  await app.register(onboardingRoutes(services.onboarding), { prefix: '/api' })
  await app.register(mediaRoutes(services.media))

  if (isProduction) {
    await registerStatic(app, env.WEB_DIST_DIR ?? defaultWebDistDir())
  }

  return app
}
