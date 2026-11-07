import {
  issueResetCodeResponseSchema,
  memberParamsSchema,
  redeemResetCodeBodySchema,
} from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { rateLimits } from '../../http/rate-limit'
import type { ResetCodesService } from './reset-codes.service'

/** Registers the reset code issue route and the public redeem route. */
export function resetCodesRoutes(service: ResetCodesService): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(
      '/leagues/:leagueId/members/:userId/reset-code',
      {
        preHandler: [authenticate, requireLeagueRole('owner')],
        config: { rateLimit: rateLimits.resetIssue },
        schema: { params: memberParamsSchema, response: { 201: issueResetCodeResponseSchema } },
      },
      async (request, reply) => {
        const issued = await service.issue(request.membership, request.params.userId)
        return reply.code(201).send(issued)
      },
    )
    app.post(
      '/reset-codes/redeem',
      {
        config: { rateLimit: rateLimits.resetRedeem },
        schema: { body: redeemResetCodeBodySchema },
      },
      async (request, reply) => {
        await service.redeem(request.body)
        return reply.code(204).send()
      },
    )
  }
}
