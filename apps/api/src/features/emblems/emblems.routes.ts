import {
  featuredEmblemsBodySchema,
  leagueParamsSchema,
  markEmblemsSeenBodySchema,
  memberEmblemsSchema,
  memberParamsSchema,
  unseenEmblemsSchema,
} from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { perUserRateLimit, rateLimits } from '../../http/rate-limit'
import type { EmblemsService } from './emblems.service'

/** Registers the routes reading members' emblems, the viewer's unlock queue and featured choice. */
export function emblemsRoutes(service: EmblemsService): FastifyPluginAsyncZod {
  return async (app) => {
    const member = [authenticate, requireLeagueRole('member')]
    const seenLimit = perUserRateLimit(app, 'emblems-seen', rateLimits.emblemsSeen)
    const editLimit = perUserRateLimit(app, 'profile-edit', rateLimits.profileEdit)
    app.get(
      '/leagues/:leagueId/members/:userId/emblems',
      {
        preHandler: member,
        schema: { params: memberParamsSchema, response: { 200: memberEmblemsSchema } },
      },
      (request) => service.listForMember(request.membership, request.params.userId),
    )
    app.get(
      '/leagues/:leagueId/emblems/unseen',
      {
        preHandler: member,
        schema: { params: leagueParamsSchema, response: { 200: unseenEmblemsSchema } },
      },
      (request) => service.listUnseen(request.membership),
    )
    app.post(
      '/leagues/:leagueId/emblems/seen',
      {
        preHandler: [...member, seenLimit],
        schema: { params: leagueParamsSchema, body: markEmblemsSeenBodySchema },
      },
      async (request, reply) => {
        await service.markSeen(request.membership, request.body.emblemIds)
        return reply.code(204).send()
      },
    )
    app.put(
      '/leagues/:leagueId/emblems/featured',
      {
        preHandler: [...member, editLimit],
        schema: {
          params: leagueParamsSchema,
          body: featuredEmblemsBodySchema,
          response: { 200: memberEmblemsSchema },
        },
      },
      (request) => service.setFeatured(request.membership, request.body.emblemIds),
    )
  }
}
