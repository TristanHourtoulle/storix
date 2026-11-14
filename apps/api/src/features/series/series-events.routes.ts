import {
  eventBodySchema,
  eventListSchema,
  eventPatchSchema,
  eventSummarySchema,
  leagueParamsSchema,
  seriesParamsSchema,
} from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { rateLimits } from '../../http/rate-limit'
import type { SeriesEventsService } from './series-events.service'

/** Registers the scheduled events routes; managing an event is checked in the service (creator or admin). */
export function seriesEventsRoutes(service: SeriesEventsService): FastifyPluginAsyncZod {
  return async (app) => {
    const member = [authenticate, requireLeagueRole('member')]
    app.get(
      '/leagues/:leagueId/series/events',
      {
        preHandler: member,
        config: { rateLimit: rateLimits.seriesRead },
        schema: { params: leagueParamsSchema, response: { 200: eventListSchema } },
      },
      (request) => service.list(request.membership),
    )
    app.post(
      '/leagues/:leagueId/series/events',
      {
        preHandler: member,
        config: { rateLimit: rateLimits.seriesWrite },
        schema: {
          params: leagueParamsSchema,
          body: eventBodySchema,
          response: { 201: eventSummarySchema },
        },
      },
      async (request, reply) => {
        const created = await service.create(request.membership, request.body)
        return reply.code(201).send(created)
      },
    )
    app.patch(
      '/leagues/:leagueId/series/events/:seriesId',
      {
        preHandler: member,
        config: { rateLimit: rateLimits.seriesWrite },
        schema: {
          params: seriesParamsSchema,
          body: eventPatchSchema,
          response: { 200: eventSummarySchema },
        },
      },
      (request) => service.update(request.membership, request.params.seriesId, request.body),
    )
    app.delete(
      '/leagues/:leagueId/series/events/:seriesId',
      {
        preHandler: member,
        config: { rateLimit: rateLimits.seriesWrite },
        schema: { params: seriesParamsSchema },
      },
      async (request, reply) => {
        await service.cancel(request.membership, request.params.seriesId)
        return reply.code(204).send()
      },
    )
    app.post(
      '/leagues/:leagueId/series/events/:seriesId/end',
      {
        preHandler: member,
        config: { rateLimit: rateLimits.seriesWrite },
        schema: { params: seriesParamsSchema, response: { 200: eventSummarySchema } },
      },
      (request) => service.end(request.membership, request.params.seriesId),
    )
  }
}
