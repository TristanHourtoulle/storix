import {
  adminCardPageSchema,
  adminCardSchema,
  adminCardsQuerySchema,
  captureDateValidationBodySchema,
  cardParamsSchema,
  cardVisibilityBodySchema,
  leagueParamsSchema,
  pinTierBodySchema,
  tierBoundsBodySchema,
} from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { rateLimits } from '../../http/rate-limit'
import type { ModerationService } from './moderation.service'

const CARD_PATH = '/leagues/:leagueId/admin/cards/:cardId'

/** Registers the admin card moderation routes of a league. */
export function moderationRoutes(service: ModerationService): FastifyPluginAsyncZod {
  return async (app) => {
    const adminOnly = { preHandler: [authenticate, requireLeagueRole('admin')] }
    const mutation = { ...adminOnly, config: { rateLimit: rateLimits.adminAction } }
    const cardResponse = { params: cardParamsSchema, response: { 200: adminCardSchema } }

    app.get(
      '/leagues/:leagueId/admin/cards',
      {
        ...adminOnly,
        schema: {
          params: leagueParamsSchema,
          querystring: adminCardsQuerySchema,
          response: { 200: adminCardPageSchema },
        },
      },
      (request) => service.listCards(request.membership, request.query),
    )
    app.patch(
      `${CARD_PATH}/visibility`,
      { ...mutation, schema: { ...cardResponse, body: cardVisibilityBodySchema } },
      (request) =>
        service.setVisibility(request.membership, request.params.cardId, request.body.status),
    )
    app.put(
      `${CARD_PATH}/tier-pin`,
      { ...mutation, schema: { ...cardResponse, body: pinTierBodySchema } },
      (request) => service.pinTier(request.membership, request.params.cardId, request.body.tier),
    )
    app.put(
      `${CARD_PATH}/tier-bounds`,
      { ...mutation, schema: { ...cardResponse, body: tierBoundsBodySchema } },
      (request) => service.setBounds(request.membership, request.params.cardId, request.body),
    )
    app.put(
      `${CARD_PATH}/capture-date`,
      { ...mutation, schema: { ...cardResponse, body: captureDateValidationBodySchema } },
      (request) =>
        service.setCaptureDateValidated(
          request.membership,
          request.params.cardId,
          request.body.isValidated,
        ),
    )
    app.delete(
      CARD_PATH,
      { ...mutation, schema: { params: cardParamsSchema } },
      async (request, reply) => {
        await service.deleteCard(request.membership, request.params.cardId)
        return reply.code(204).send()
      },
    )
  }
}
