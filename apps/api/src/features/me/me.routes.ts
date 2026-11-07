import { meResponseSchema, updateDisplayNameBodySchema } from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { perUserRateLimit, rateLimits } from '../../http/rate-limit'
import type { MeService } from './me.service'

/** Registers GET /api/me and PATCH /api/me. */
export function meRoutes(service: MeService): FastifyPluginAsyncZod {
  return async (app) => {
    const displayNameLimit = perUserRateLimit(app, 'display-name', rateLimits.displayNameChange)
    app.get(
      '/me',
      { preHandler: authenticate, schema: { response: { 200: meResponseSchema } } },
      (request) => service.getMe(request.authSession),
    )
    app.patch(
      '/me',
      {
        preHandler: [authenticate, displayNameLimit],
        config: { rateLimit: rateLimits.displayNameChangeIp },
        schema: { body: updateDisplayNameBodySchema, response: { 200: meResponseSchema } },
      },
      (request) => service.updateDisplayName(request.authSession, request.body.displayName),
    )
  }
}
