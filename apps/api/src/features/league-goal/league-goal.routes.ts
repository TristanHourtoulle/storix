import { goalContributorsSchema, leagueGoalSchema, leagueParamsSchema } from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { rateLimits } from '../../http/rate-limit'
import type { LeagueGoalService } from './league-goal.service'

/** Registers the weekly league goal routes. */
export function leagueGoalRoutes(service: LeagueGoalService): FastifyPluginAsyncZod {
  return async (app) => {
    const member = [authenticate, requireLeagueRole('member')]
    app.get(
      '/leagues/:leagueId/goal',
      {
        preHandler: member,
        config: { rateLimit: rateLimits.goalRead },
        schema: { params: leagueParamsSchema, response: { 200: leagueGoalSchema } },
      },
      (request) => service.getGoal(request.membership),
    )
    app.get(
      '/leagues/:leagueId/goal/contributors',
      {
        preHandler: member,
        config: { rateLimit: rateLimits.goalRead },
        schema: { params: leagueParamsSchema, response: { 200: goalContributorsSchema } },
      },
      (request) => service.listContributors(request.membership),
    )
    app.post(
      '/leagues/:leagueId/goal/banner-seen',
      {
        preHandler: member,
        config: { rateLimit: rateLimits.goalBannerSeen },
        schema: { params: leagueParamsSchema },
      },
      async (request, reply) => {
        await service.markBannerSeen(request.membership)
        return reply.code(204).send()
      },
    )
  }
}
