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
import { registerErrorHandling } from './http/error-handler'
import { registerOriginCheck } from './http/origin-check'
import { AppError } from './lib/errors'
import { buildLoggerOptions } from './lib/logger'

/** Builds the Fastify application with security hooks and feature routes. */
export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { env } = deps
  const app = Fastify({
    logger: buildLoggerOptions(env),
    trustProxy: clientIpPolicy(env).trustProxy,
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  registerErrorHandling(app)

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

  const services = buildServices(deps)
  await app.register(authRoutes(deps.auth, env.APP_ORIGIN))
  await app.register(healthRoutes(services.health), { prefix: '/api' })

  return app
}
