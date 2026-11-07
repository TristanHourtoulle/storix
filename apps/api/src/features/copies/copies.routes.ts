import { cardParamsSchema, dustBalanceSchema, recycleBodySchema } from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { rateLimits } from '../../http/rate-limit'
import type { CopiesService } from './copies.service'

/** Registers the recycle and foil upgrade routes of a card (crafting is disabled: its route is not registered). */
export function copiesRoutes(service: CopiesService): FastifyPluginAsyncZod {
  return async (app) => {
    const guard = {
      preHandler: [authenticate, requireLeagueRole('member')],
      config: { rateLimit: rateLimits.cardAction },
    }
    const schema = { params: cardParamsSchema, response: { 200: dustBalanceSchema } }
    app.post(
      '/leagues/:leagueId/cards/:cardId/recycle',
      { ...guard, schema: { ...schema, body: recycleBodySchema } },
      (request) => service.recycle(request.membership, request.params.cardId, request.body.variant),
    )
    app.post('/leagues/:leagueId/cards/:cardId/foil', { ...guard, schema }, (request) =>
      service.upgradeToFoil(request.membership, request.params.cardId),
    )
  }
}
