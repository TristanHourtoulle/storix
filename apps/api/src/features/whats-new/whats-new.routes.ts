import {
  leagueParamsSchema,
  markWhatsNewSeenBodySchema,
  whatsNewStateSchema,
  whatsNewTargetsSchema,
} from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { perUserRateLimit, rateLimits } from '../../http/rate-limit'
import type { WhatsNewService } from './whats-new.service'

/** Registers the what's new state, mark-seen and per-league "Essayer" targets routes. */
export function whatsNewRoutes(service: WhatsNewService): FastifyPluginAsyncZod {
  return async (app) => {
    const seenLimit = perUserRateLimit(app, 'whats-new-seen', rateLimits.whatsNewSeen)
    app.get(
      '/whats-new',
      { preHandler: authenticate, schema: { response: { 200: whatsNewStateSchema } } },
      (request) => service.getState(request.authSession),
    )
    app.post(
      '/whats-new/seen',
      {
        preHandler: [authenticate, seenLimit],
        config: { rateLimit: rateLimits.whatsNewSeenIp },
        schema: { body: markWhatsNewSeenBodySchema, response: { 200: whatsNewStateSchema } },
      },
      (request) => service.markSeen(request.authSession, request.body.releaseId),
    )
    app.get(
      '/leagues/:leagueId/whats-new/targets',
      {
        preHandler: [authenticate, requireLeagueRole('member')],
        schema: { params: leagueParamsSchema, response: { 200: whatsNewTargetsSchema } },
      },
      (request) => service.getTargets(request.membership),
    )
  }
}
