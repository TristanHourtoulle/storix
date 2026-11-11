import {
  createMomentUploadsBodySchema,
  createMomentUploadsResponseSchema,
  currentMomentSchema,
  leagueParamsSchema,
  postMomentBodySchema,
  postMomentResponseSchema,
} from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { rateLimits } from '../../http/rate-limit'
import type { MomentsService } from './moments.service'

/** Registers the Moment routes: the target Moment, the two-camera upload reservation and the post. */
export function momentsRoutes(service: MomentsService): FastifyPluginAsyncZod {
  return async (app) => {
    const member = [authenticate, requireLeagueRole('member')]
    app.get(
      '/leagues/:leagueId/moments/current',
      {
        preHandler: member,
        config: { rateLimit: rateLimits.momentRead },
        schema: { params: leagueParamsSchema, response: { 200: currentMomentSchema } },
      },
      (request) => service.getCurrent(request.membership),
    )
    app.post(
      '/leagues/:leagueId/moments/uploads',
      {
        preHandler: member,
        config: { rateLimit: rateLimits.momentWrite },
        schema: {
          params: leagueParamsSchema,
          body: createMomentUploadsBodySchema,
          response: { 201: createMomentUploadsResponseSchema },
        },
      },
      async (request, reply) =>
        reply.code(201).send(await service.createUploads(request.membership)),
    )
    app.post(
      '/leagues/:leagueId/moments',
      {
        preHandler: member,
        config: { rateLimit: rateLimits.momentWrite },
        schema: {
          params: leagueParamsSchema,
          body: postMomentBodySchema,
          response: { 201: postMomentResponseSchema },
        },
      },
      async (request, reply) =>
        reply.code(201).send(await service.post(request.membership, request.body)),
    )
  }
}
