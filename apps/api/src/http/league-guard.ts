import { hasRoleAtLeast, leagueParamsSchema, type LeagueRole } from '@storix/shared'
import type { FastifyRequest } from 'fastify'
import type { Services } from '../deps'
import type { Membership } from '../features/leagues/leagues.service'
import { forbidden, notFound } from '../lib/errors'

declare module 'fastify' {
  interface FastifyInstance {
    services: Services
  }
  interface FastifyRequest {
    membership: Membership
  }
}

/** Builds a preHandler requiring the session user to hold at least the given role in params.leagueId. */
export function requireLeagueRole(min: LeagueRole) {
  return async (request: FastifyRequest): Promise<void> => {
    const params = leagueParamsSchema.safeParse(request.params)
    if (!params.success) throw notFound()
    const membership = await request.server.services.leagues.getMembership(
      params.data.leagueId,
      request.authSession.userId,
    )
    if (membership === null) throw notFound()
    if (!hasRoleAtLeast(membership.role, min)) throw forbidden()
    request.membership = membership
  }
}
