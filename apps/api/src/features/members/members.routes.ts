import {
  leagueParamsSchema,
  memberParamsSchema,
  memberSummarySchema,
  updateMemberRoleBodySchema,
} from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import type { MembersService } from './members.service'

/** Registers the league member listing, role change and removal routes. */
export function membersRoutes(service: MembersService): FastifyPluginAsyncZod {
  return async (app) => {
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
        schema: { params: memberParamsSchema },
      },
      async (request, reply) => {
        await service.removeMember(request.membership, request.params.userId)
        return reply.code(204).send()
      },
    )
  }
}
