import { cardParamsSchema, cardTagParamsSchema } from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { rateLimits } from '../../http/rate-limit'
import type { TagsService } from './tags.service'

/** Registers the routes tagging the viewer on a card and removing a tag. */
export function tagsRoutes(service: TagsService): FastifyPluginAsyncZod {
  return async (app) => {
    const preHandler = [authenticate, requireLeagueRole('member')]
    const config = { rateLimit: rateLimits.cardAction }
    app.post(
      '/leagues/:leagueId/cards/:cardId/tags/me',
      { preHandler, config, schema: { params: cardParamsSchema } },
      async (request, reply) => {
        await service.tagSelf(request.membership, request.params.cardId)
        return reply.code(204).send()
      },
    )
    app.delete(
      '/leagues/:leagueId/cards/:cardId/tags/:userId',
      { preHandler, config, schema: { params: cardTagParamsSchema } },
      async (request, reply) => {
        await service.removeTag(request.membership, request.params.cardId, request.params.userId)
        return reply.code(204).send()
      },
    )
  }
}
