import { boosterOpeningSchema, leagueParamsSchema, openBoosterBodySchema } from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { rateLimits } from '../../http/rate-limit'
import type { BoostersService } from './boosters.service'

/** Registers the booster opening route. */
export function boostersRoutes(service: BoostersService): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(
      '/leagues/:leagueId/boosters',
      {
        preHandler: [authenticate, requireLeagueRole('member')],
        config: { rateLimit: rateLimits.boosterOpen },
        schema: {
          params: leagueParamsSchema,
          body: openBoosterBodySchema,
          response: { 200: boosterOpeningSchema },
        },
      },
      (request) => service.openBooster(request.membership, request.body.requestId),
    )
  }
}
