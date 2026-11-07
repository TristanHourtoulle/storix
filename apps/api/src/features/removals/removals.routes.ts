import { leagueParamsSchema, removedCardsQuerySchema, removedCardsSchema } from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import type { RemovalsService } from './removals.service'

/** Registers the route listing the league cards removed since a cursor. */
export function removalsRoutes(service: RemovalsService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/leagues/:leagueId/removed-cards',
      {
        preHandler: [authenticate, requireLeagueRole('member')],
        schema: {
          params: leagueParamsSchema,
          querystring: removedCardsQuerySchema,
          response: { 200: removedCardsSchema },
        },
      },
      (request) => {
        const { since } = request.query
        return service.listRemovedCards(
          request.membership,
          since === undefined ? undefined : new Date(since),
        )
      },
    )
  }
}
