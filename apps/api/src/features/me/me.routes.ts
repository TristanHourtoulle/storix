import { meResponseSchema } from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import type { MeService } from './me.service'

/** Registers GET /api/me. */
export function meRoutes(service: MeService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/me',
      { preHandler: authenticate, schema: { response: { 200: meResponseSchema } } },
      (request) => service.getMe(request.authSession),
    )
  }
}
