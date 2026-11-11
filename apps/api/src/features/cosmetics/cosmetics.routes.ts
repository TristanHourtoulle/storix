import {
  equipCosmeticBodySchema,
  equippedCosmeticsSchema,
  leagueParamsSchema,
  myCosmeticsResponseSchema,
  purchaseCosmeticBodySchema,
  purchaseCosmeticResponseSchema,
  tryOnCardsResponseSchema,
} from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import type { CosmeticsService } from './cosmetics.service'

/** Registers the cosmetics shop routes: owned and equipped items, equip, purchase and try-on cards. */
export function cosmeticsRoutes(service: CosmeticsService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/me/cosmetics',
      { preHandler: authenticate, schema: { response: { 200: myCosmeticsResponseSchema } } },
      (request) => service.getMine(request.authSession.userId),
    )
    app.put(
      '/me/cosmetics/equipped',
      {
        preHandler: authenticate,
        schema: { body: equipCosmeticBodySchema, response: { 200: equippedCosmeticsSchema } },
      },
      (request) => service.equip(request.authSession.userId, request.body),
    )
    app.post(
      '/leagues/:leagueId/cosmetics/purchases',
      {
        preHandler: [authenticate, requireLeagueRole('member')],
        schema: {
          params: leagueParamsSchema,
          body: purchaseCosmeticBodySchema,
          response: { 200: purchaseCosmeticResponseSchema },
        },
      },
      (request) => service.purchase(request.membership, request.body),
    )
    app.get(
      '/leagues/:leagueId/cosmetics/try-on-cards',
      {
        preHandler: [authenticate, requireLeagueRole('member')],
        schema: { params: leagueParamsSchema, response: { 200: tryOnCardsResponseSchema } },
      },
      async (request) => ({ cards: await service.tryOnCards(request.membership) }),
    )
  }
}
