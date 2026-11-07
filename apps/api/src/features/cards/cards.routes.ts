import {
  cardParamsSchema,
  collectionPageSchema,
  leagueParamsSchema,
  listCardsQuerySchema,
  viewerCardDetailSchema,
} from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import type { CardsService } from './cards.service'

/** Registers the league card collection and card detail routes. */
export function cardsRoutes(service: CardsService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/leagues/:leagueId/cards',
      {
        preHandler: [authenticate, requireLeagueRole('member')],
        schema: {
          params: leagueParamsSchema,
          querystring: listCardsQuerySchema,
          response: { 200: collectionPageSchema },
        },
      },
      (request) => service.listCards(request.membership, request.query),
    )
    app.get(
      '/leagues/:leagueId/cards/:cardId',
      {
        preHandler: [authenticate, requireLeagueRole('member')],
        schema: { params: cardParamsSchema, response: { 200: viewerCardDetailSchema } },
      },
      (request) => service.getCard(request.membership, request.params.cardId),
    )
  }
}
