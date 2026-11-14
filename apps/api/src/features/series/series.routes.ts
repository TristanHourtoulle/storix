import {
  addSeriesCardBodySchema,
  leagueParamsSchema,
  nextThemeSchema,
  seriesDetailSchema,
  seriesParamsSchema,
  seriesShelfSchema,
  themeCardSchema,
  themeOverrideBodySchema,
} from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { rateLimits } from '../../http/rate-limit'
import type { SeriesService } from './series.service'

/** Registers the series routes: shelf, weekly theme, series page, next theme and own cards. */
export function seriesRoutes(service: SeriesService): FastifyPluginAsyncZod {
  return async (app) => {
    const member = [authenticate, requireLeagueRole('member')]
    const admin = [authenticate, requireLeagueRole('admin')]
    app.get(
      '/leagues/:leagueId/series',
      {
        preHandler: member,
        config: { rateLimit: rateLimits.seriesRead },
        schema: { params: leagueParamsSchema, response: { 200: seriesShelfSchema } },
      },
      (request) => service.getShelf(request.membership),
    )
    app.get(
      '/leagues/:leagueId/series/theme',
      {
        preHandler: member,
        config: { rateLimit: rateLimits.seriesRead },
        schema: { params: leagueParamsSchema, response: { 200: themeCardSchema } },
      },
      (request) => service.getThemeCard(request.membership),
    )
    app.put(
      '/leagues/:leagueId/series/theme/next',
      {
        preHandler: admin,
        config: { rateLimit: rateLimits.seriesWrite },
        schema: {
          params: leagueParamsSchema,
          body: themeOverrideBodySchema,
          response: { 200: nextThemeSchema },
        },
      },
      (request) => service.setNextTheme(request.membership, request.body),
    )
    app.get(
      '/leagues/:leagueId/series/:seriesId',
      {
        preHandler: member,
        config: { rateLimit: rateLimits.seriesRead },
        schema: { params: seriesParamsSchema, response: { 200: seriesDetailSchema } },
      },
      (request) => service.getSeries(request.membership, request.params.seriesId),
    )
    app.post(
      '/leagues/:leagueId/series/:seriesId/cards',
      {
        preHandler: member,
        config: { rateLimit: rateLimits.seriesWrite },
        schema: { params: seriesParamsSchema, body: addSeriesCardBodySchema },
      },
      async (request, reply) => {
        await service.addCard(request.membership, request.params.seriesId, request.body.cardId)
        return reply.code(204).send()
      },
    )
  }
}
