import {
  feedBravoSchema,
  feedEventParamsSchema,
  feedHighlightsSchema,
  feedPageSchema,
  feedQuerySchema,
  leagueParamsSchema,
} from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { rateLimits } from '../../http/rate-limit'
import type { LeagueFeedService } from './league-feed.service'

/** Registers the league feed, Bravo and Mythic highlight routes. */
export function leagueFeedRoutes(service: LeagueFeedService): FastifyPluginAsyncZod {
  return async (app) => {
    const member = [authenticate, requireLeagueRole('member')]
    app.get(
      '/leagues/:leagueId/feed',
      {
        preHandler: member,
        schema: {
          params: leagueParamsSchema,
          querystring: feedQuerySchema,
          response: { 200: feedPageSchema },
        },
      },
      (request) => service.listFeed(request.membership, request.query),
    )
    app.post(
      '/leagues/:leagueId/feed/seen',
      {
        preHandler: member,
        config: { rateLimit: rateLimits.cardAction },
        schema: { params: leagueParamsSchema },
      },
      async (request, reply) => {
        await service.markFeedSeen(request.membership)
        return reply.code(204).send()
      },
    )
    app.put(
      '/leagues/:leagueId/feed/events/:eventId/bravo',
      {
        preHandler: member,
        config: { rateLimit: rateLimits.cardAction },
        schema: { params: feedEventParamsSchema, response: { 200: feedBravoSchema } },
      },
      (request) => service.sendBravo(request.membership, request.params.eventId),
    )
    app.get(
      '/leagues/:leagueId/feed/highlights',
      {
        preHandler: member,
        schema: { params: leagueParamsSchema, response: { 200: feedHighlightsSchema } },
      },
      (request) => service.listHighlights(request.membership),
    )
    app.post(
      '/leagues/:leagueId/feed/highlights/seen',
      {
        preHandler: member,
        config: { rateLimit: rateLimits.cardAction },
        schema: { params: leagueParamsSchema },
      },
      async (request, reply) => {
        await service.markHighlightsSeen(request.membership)
        return reply.code(204).send()
      },
    )
  }
}
