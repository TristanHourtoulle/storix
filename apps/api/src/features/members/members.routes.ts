import {
  leaveLeagueBodySchema,
  leagueParamsSchema,
  memberParamsSchema,
  memberProfileSchema,
  memberSummarySchema,
  removeMemberBodySchema,
  transferOwnershipBodySchema,
  updateMemberRoleBodySchema,
} from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { rateLimits } from '../../http/rate-limit'
import type { MemberProfileService } from './member-profile.service'
import type { MembersService } from './members.service'

/** Registers the league member listing, member profile, role change, removal, leave and ownership transfer routes. */
export function membersRoutes(
  service: MembersService,
  profiles: MemberProfileService,
): FastifyPluginAsyncZod {
  return async (app) => {
    const limited = { rateLimit: rateLimits.adminAction }
    app.get(
      '/leagues/:leagueId/members/:userId/profile',
      {
        preHandler: [authenticate, requireLeagueRole('member')],
        schema: { params: memberParamsSchema, response: { 200: memberProfileSchema } },
      },
      (request) => profiles.getProfile(request.membership, request.params.userId),
    )
    app.get(
      '/leagues/:leagueId/members',
      {
        preHandler: [authenticate, requireLeagueRole('member')],
        schema: { params: leagueParamsSchema, response: { 200: z.array(memberSummarySchema) } },
      },
      (request) => service.listMembers(request.membership),
    )
    app.patch(
      '/leagues/:leagueId/members/:userId',
      {
        preHandler: [authenticate, requireLeagueRole('admin')],
        config: limited,
        schema: { params: memberParamsSchema, body: updateMemberRoleBodySchema },
      },
      async (request, reply) => {
        await service.changeRole(request.membership, request.params.userId, request.body.role)
        return reply.code(204).send()
      },
    )
    app.delete(
      '/leagues/:leagueId/members/:userId',
      {
        preHandler: [authenticate, requireLeagueRole('admin')],
        config: limited,
        schema: { params: memberParamsSchema, body: removeMemberBodySchema },
      },
      async (request, reply) => {
        await service.removeMember(request.membership, request.params.userId, request.body.photos)
        return reply.code(204).send()
      },
    )
    app.delete(
      '/leagues/:leagueId/membership',
      {
        preHandler: [authenticate, requireLeagueRole('member')],
        config: limited,
        schema: { params: leagueParamsSchema, body: leaveLeagueBodySchema },
      },
      async (request, reply) => {
        await service.leaveLeague(request.membership, request.body.photos)
        return reply.code(204).send()
      },
    )
    app.post(
      '/leagues/:leagueId/ownership',
      {
        preHandler: [authenticate, requireLeagueRole('owner')],
        config: limited,
        schema: { params: leagueParamsSchema, body: transferOwnershipBodySchema },
      },
      async (request, reply) => {
        await service.transferOwnership(request.membership, request.body.userId)
        return reply.code(204).send()
      },
    )
  }
}
