import { leagueParamsSchema, saveShowcaseBodySchema } from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { perUserRateLimit, rateLimits } from '../../http/rate-limit'
import type { ShowcaseService } from './showcase.service'

/** Registers the routes saving and resetting the viewer's showcase. */
export function showcaseRoutes(service: ShowcaseService): FastifyPluginAsyncZod {
  return async (app) => {
    const editLimit = perUserRateLimit(app, 'showcase-edit', rateLimits.profileEdit)
    const preHandler = [authenticate, requireLeagueRole('member'), editLimit]
    app.put(
      '/leagues/:leagueId/showcase',
      { preHandler, schema: { params: leagueParamsSchema, body: saveShowcaseBodySchema } },
      async (request, reply) => {
        await service.save(request.membership, request.body.cardIds)
        return reply.code(204).send()
      },
    )
    app.delete(
      '/leagues/:leagueId/showcase',
      { preHandler, schema: { params: leagueParamsSchema } },
      async (request, reply) => {
        await service.reset(request.membership)
        return reply.code(204).send()
      },
    )
  }
}
