import { cardParamsSchema, leagueParamsSchema, taggedCardSchema } from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { rateLimits } from '../../http/rate-limit'
import type { WithdrawalsService } from './withdrawals.service'

/** Registers the tagged-card listing and the card withdrawal routes of a league. */
export function withdrawalsRoutes(service: WithdrawalsService): FastifyPluginAsyncZod {
  return async (app) => {
    const memberOnly = { preHandler: [authenticate, requireLeagueRole('member')] }

    app.get(
      '/leagues/:leagueId/me/tagged-cards',
      {
        ...memberOnly,
        schema: { params: leagueParamsSchema, response: { 200: z.array(taggedCardSchema) } },
      },
      (request) => service.listTaggedCards(request.membership),
    )
    app.post(
      '/leagues/:leagueId/cards/:cardId/withdraw',
      {
        ...memberOnly,
        config: { rateLimit: rateLimits.adminAction },
        schema: { params: cardParamsSchema },
      },
      async (request, reply) => {
        await service.withdraw(request.membership, request.params.cardId)
        return reply.code(204).send()
      },
    )
  }
}
