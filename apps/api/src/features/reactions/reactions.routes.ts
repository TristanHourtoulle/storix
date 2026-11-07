import { reactionCountsSchema, reactionParamsSchema } from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { rateLimits } from '../../http/rate-limit'
import type { ReactionsService } from './reactions.service'

/** Registers the routes adding and removing a member's reaction to a card. */
export function reactionsRoutes(service: ReactionsService): FastifyPluginAsyncZod {
  return async (app) => {
    const options = {
      preHandler: [authenticate, requireLeagueRole('member')],
      config: { rateLimit: rateLimits.cardAction },
      schema: { params: reactionParamsSchema, response: { 200: reactionCountsSchema } },
    }
    app.put('/leagues/:leagueId/cards/:cardId/reactions/:type', options, (request) =>
      service.setReaction(request.membership, request.params.cardId, request.params.type, true),
    )
    app.delete('/leagues/:leagueId/cards/:cardId/reactions/:type', options, (request) =>
      service.setReaction(request.membership, request.params.cardId, request.params.type, false),
    )
  }
}
