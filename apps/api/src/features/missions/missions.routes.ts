import {
  leagueParamsSchema,
  memberParamsSchema,
  missionClaimSchema,
  missionParamsSchema,
  missionRerollSchema,
  missionsStateSchema,
} from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { rateLimits } from '../../http/rate-limit'
import type { MissionsService } from './missions.service'

/** Registers the missions routes and the member page visit trace they rely on. */
export function missionsRoutes(service: MissionsService): FastifyPluginAsyncZod {
  return async (app) => {
    const member = [authenticate, requireLeagueRole('member')]
    app.get(
      '/leagues/:leagueId/missions',
      {
        preHandler: member,
        config: { rateLimit: rateLimits.missionsRead },
        schema: { params: leagueParamsSchema, response: { 200: missionsStateSchema } },
      },
      (request) => service.getMissions(request.membership),
    )
    app.post(
      '/leagues/:leagueId/missions/:missionId/claim',
      {
        preHandler: member,
        config: { rateLimit: rateLimits.missionClaim },
        schema: { params: missionParamsSchema, response: { 200: missionClaimSchema } },
      },
      (request) => service.claim(request.membership, request.params.missionId),
    )
    app.post(
      '/leagues/:leagueId/missions/:missionId/reroll',
      {
        preHandler: member,
        config: { rateLimit: rateLimits.missionReroll },
        schema: { params: missionParamsSchema, response: { 200: missionRerollSchema } },
      },
      (request) => service.reroll(request.membership, request.params.missionId),
    )
    app.post(
      '/leagues/:leagueId/members/:userId/visit',
      {
        preHandler: member,
        config: { rateLimit: rateLimits.memberVisit },
        schema: { params: memberParamsSchema },
      },
      async (request, reply) => {
        await service.recordVisit(request.membership, request.params.userId)
        return reply.code(204).send()
      },
    )
  }
}
