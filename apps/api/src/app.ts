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
import { clientIpPolicy } from './config/client-ip'
import { buildServices, type AppDeps } from './deps'
import { healthRoutes } from './features/health/health.routes'
import { invitationsRoutes } from './features/invitations/invitations.routes'
import { leaguesRoutes } from './features/leagues/leagues.routes'
import { meRoutes } from './features/me/me.routes'
import { membersRoutes } from './features/members/members.routes'
import { resetCodesRoutes } from './features/reset-codes/reset-codes.routes'
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
    errorResponseBuilder: (_request, context) =>
      new AppError('RATE_LIMITED', 429, 'Too many requests', { retryAfter: context.after }),
  })
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: { defaultSrc: ["'self'"], imgSrc: ["'self'", 'data:', 'blob:'] },
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
  await app.register(leaguesRoutes(services.leagues), { prefix: '/api' })
  await app.register(invitationsRoutes(services.invitations), { prefix: '/api' })
  await app.register(membersRoutes(services.members), { prefix: '/api' })
  await app.register(resetCodesRoutes(services.resetCodes), { prefix: '/api' })

  if (isProduction) {
    await registerStatic(app, env.WEB_DIST_DIR ?? defaultWebDistDir())
  }

  return app
}
