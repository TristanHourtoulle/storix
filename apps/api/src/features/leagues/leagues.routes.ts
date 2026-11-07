import {
  createLeagueBodySchema,
  leagueDetailSchema,
  leagueParamsSchema,
  leagueSummarySchema,
} from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import type { LeaguesService } from './leagues.service'

/** Registers the league routes under /api/leagues. */
export function leaguesRoutes(service: LeaguesService): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(
      '/leagues',
      {
        preHandler: authenticate,
        schema: { body: createLeagueBodySchema, response: { 201: leagueSummarySchema } },
      },
      async (request, reply) => {
        const league = await service.createLeague(request.authSession.userId, request.body.name)
        return reply.code(201).send(league)
      },
    )
    app.get(
      '/leagues/:leagueId',
      {
        preHandler: [authenticate, requireLeagueRole('member')],
        schema: { params: leagueParamsSchema, response: { 200: leagueDetailSchema } },
      },
      (request) => service.getLeagueDetail(request.params.leagueId, request.membership),
    )
  }
}
