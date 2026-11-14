import { leagueParamsSchema, leagueStandingsSchema } from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { rateLimits } from '../../http/rate-limit'
import type { StandingsService } from './standings.service'

/** Registers the Ligue page route: rankings and trophy stats of every current member. */
export function standingsRoutes(service: StandingsService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/leagues/:leagueId/standings',
      {
        preHandler: [authenticate, requireLeagueRole('member')],
        config: { rateLimit: rateLimits.standingsRead },
        schema: { params: leagueParamsSchema, response: { 200: leagueStandingsSchema } },
      },
      (request) => service.getStandings(request.membership),
    )
  }
}
