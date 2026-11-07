import {
  createInvitationBodySchema,
  createInvitationResponseSchema,
  invitationPreviewSchema,
  invitationSummarySchema,
  invitationTokenSchema,
  joinResponseSchema,
  leagueParamsSchema,
  signupBodySchema,
} from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { authenticate, optionalAuthenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { rateLimits } from '../../http/rate-limit'
import type { InvitationsService } from './invitations.service'

const invitationParamsSchema = leagueParamsSchema.extend({ invitationId: z.uuid() })
const tokenParamsSchema = z.object({ token: invitationTokenSchema })

/** Registers the league invitation management routes and the public invitation routes. */
export function invitationsRoutes(service: InvitationsService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/leagues/:leagueId/invitations',
      {
        preHandler: [authenticate, requireLeagueRole('admin')],
        schema: {
          params: leagueParamsSchema,
          response: { 200: z.array(invitationSummarySchema) },
        },
      },
      (request) => service.listInvitations(request.membership),
    )
    app.post(
      '/leagues/:leagueId/invitations',
      {
        preHandler: [authenticate, requireLeagueRole('admin')],
        config: { rateLimit: rateLimits.invitationCreate },
        schema: {
          params: leagueParamsSchema,
          body: createInvitationBodySchema,
          response: { 201: createInvitationResponseSchema },
        },
      },
      async (request, reply) => {
        const created = await service.createInvitation(request.membership, request.body)
        return reply.code(201).send(created)
      },
    )
    app.delete(
      '/leagues/:leagueId/invitations/:invitationId',
      {
        preHandler: [authenticate, requireLeagueRole('admin')],
        schema: { params: invitationParamsSchema },
      },
      async (request, reply) => {
        await service.revokeInvitation(request.membership, request.params.invitationId)
        return reply.code(204).send()
      },
    )
    app.get(
      '/invitations/:token',
      {
        preHandler: optionalAuthenticate,
        config: { rateLimit: rateLimits.invitationPublic },
        schema: { params: tokenParamsSchema, response: { 200: invitationPreviewSchema } },
      },
      (request) =>
        service.previewInvitation(
          request.params.token,
          request.optionalAuthSession?.userId ?? null,
        ),
    )
    app.post(
      '/invitations/:token/signup',
      {
        config: { rateLimit: rateLimits.invitationPublic },
        schema: {
          params: tokenParamsSchema,
          body: signupBodySchema,
          response: { 201: joinResponseSchema },
        },
      },
      async (request, reply) => {
        const joined = await service.signupWithInvitation(request.params.token, request.body)
        return reply.code(201).send(joined)
      },
    )
    app.post(
      '/invitations/:token/accept',
      {
        preHandler: authenticate,
        config: { rateLimit: rateLimits.invitationPublic },
        schema: { params: tokenParamsSchema, response: { 200: joinResponseSchema } },
      },
      (request) => service.acceptInvitation(request.params.token, request.authSession.userId),
    )
  }
}
