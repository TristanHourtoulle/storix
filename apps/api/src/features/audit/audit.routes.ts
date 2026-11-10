import {
  auditCountSchema,
  auditFilterQuerySchema,
  auditPageSchema,
  auditQuerySchema,
  leagueParamsSchema,
} from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { rateLimits } from '../../http/rate-limit'
import type { AuditService } from './audit.service'

/** Registers the admin Journal routes. */
export function auditRoutes(service: AuditService): FastifyPluginAsyncZod {
  return async (app) => {
    const admin = [authenticate, requireLeagueRole('admin')]
    app.get(
      '/leagues/:leagueId/audit',
      {
        preHandler: admin,
        config: { rateLimit: rateLimits.adminAction },
        schema: {
          params: leagueParamsSchema,
          querystring: auditQuerySchema,
          response: { 200: auditPageSchema },
        },
      },
      (request) => service.listJournal(request.membership, request.query),
    )
    app.get(
      '/leagues/:leagueId/audit/count',
      {
        preHandler: admin,
        config: { rateLimit: rateLimits.adminAction },
        schema: {
          params: leagueParamsSchema,
          querystring: auditFilterQuerySchema,
          response: { 200: auditCountSchema },
        },
      },
      (request) => service.countJournal(request.membership, request.query),
    )
    app.post(
      '/leagues/:leagueId/audit/seen',
      {
        preHandler: admin,
        config: { rateLimit: rateLimits.adminAction },
        schema: { params: leagueParamsSchema },
      },
      async (request, reply) => {
        await service.markJournalSeen(request.membership)
        return reply.code(204).send()
      },
    )
  }
}
