import {
  charmShopResponseSchema,
  leagueParamsSchema,
  purchaseCharmBodySchema,
  purchaseCharmResponseSchema,
} from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import type { CharmsService } from './charms.service'

/** Registers the porte-bonheur routes: the charm shop state and charm purchases. */
export function charmsRoutes(service: CharmsService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/leagues/:leagueId/charms',
      {
        preHandler: [authenticate, requireLeagueRole('member')],
        schema: { params: leagueParamsSchema, response: { 200: charmShopResponseSchema } },
      },
      (request) => service.getShop(request.membership),
    )
    app.post(
      '/leagues/:leagueId/charms/purchases',
      {
        preHandler: [authenticate, requireLeagueRole('member')],
        schema: {
          params: leagueParamsSchema,
          body: purchaseCharmBodySchema,
          response: { 200: purchaseCharmResponseSchema },
        },
      },
      (request) => service.purchase(request.membership, request.body),
    )
  }
}
