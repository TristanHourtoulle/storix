import {
  discardUploadsBodySchema,
  editUploadBodySchema,
  leagueParamsSchema,
  uploadDraftsResponseSchema,
  uploadIdsBodySchema,
  uploadParamsSchema,
  uploadStateSchema,
  uploadStatesQuerySchema,
  uploadStatesResponseSchema,
} from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { rateLimits } from '../../http/rate-limit'
import type { UploadDraftsService } from './upload-drafts.service'

const memberOnly = [authenticate, requireLeagueRole('member')]

/** Registers the draft routes: list, states, discard, publish and per-upload edit, all scoped to the member's own uploads. */
export function uploadDraftsRoutes(service: UploadDraftsService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/leagues/:leagueId/uploads/drafts',
      {
        preHandler: memberOnly,
        config: { rateLimit: rateLimits.uploadEdit },
        schema: { params: leagueParamsSchema, response: { 200: uploadDraftsResponseSchema } },
      },
      async (request) => ({ drafts: await service.listDrafts(request.membership) }),
    )
    app.get(
      '/leagues/:leagueId/uploads/states',
      {
        preHandler: memberOnly,
        config: { rateLimit: rateLimits.uploadEdit },
        schema: {
          params: leagueParamsSchema,
          querystring: uploadStatesQuerySchema,
          response: { 200: uploadStatesResponseSchema },
        },
      },
      async (request) => ({
        states: await service.listStates(request.membership, request.query.ids),
      }),
    )
    app.post(
      '/leagues/:leagueId/uploads/discard',
      {
        preHandler: memberOnly,
        config: { rateLimit: rateLimits.uploadEdit },
        schema: { params: leagueParamsSchema, body: discardUploadsBodySchema },
      },
      async (request, reply) => {
        await service.discard(request.membership, request.body.uploadIds)
        return reply.code(204).send()
      },
    )
    app.post(
      '/leagues/:leagueId/uploads/publish',
      {
        preHandler: memberOnly,
        config: { rateLimit: rateLimits.uploadPublish },
        schema: {
          params: leagueParamsSchema,
          body: uploadIdsBodySchema,
          response: { 202: uploadStatesResponseSchema },
        },
      },
      async (request, reply) => {
        const states = await service.publish(request.membership, request.body.uploadIds)
        return reply.code(202).send({ states })
      },
    )
    app.patch(
      '/leagues/:leagueId/uploads/:uploadId',
      {
        preHandler: memberOnly,
        config: { rateLimit: rateLimits.uploadEdit },
        schema: {
          params: uploadParamsSchema,
          body: editUploadBodySchema,
          response: { 200: uploadStateSchema },
        },
      },
      (request) => service.editUpload(request.membership, request.params.uploadId, request.body),
    )
  }
}
