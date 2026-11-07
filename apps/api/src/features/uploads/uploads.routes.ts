import {
  completeUploadBodySchema,
  createUploadBodySchema,
  createUploadResponseSchema,
  leagueParamsSchema,
  uploadParamsSchema,
  uploadQuotaSchema,
  uploadStateSchema,
} from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { rateLimits } from '../../http/rate-limit'
import type { UploadsService } from './uploads.service'

/** Registers the upload quota, presign, completion and status routes. */
export function uploadsRoutes(service: UploadsService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/leagues/:leagueId/uploads/quota',
      {
        preHandler: [authenticate, requireLeagueRole('member')],
        schema: { params: leagueParamsSchema, response: { 200: uploadQuotaSchema } },
      },
      (request) => service.getQuota(request.membership),
    )
    app.post(
      '/leagues/:leagueId/uploads',
      {
        preHandler: [authenticate, requireLeagueRole('member')],
        config: { rateLimit: rateLimits.uploadCreate },
        schema: {
          params: leagueParamsSchema,
          body: createUploadBodySchema,
          response: { 201: createUploadResponseSchema },
        },
      },
      async (request, reply) => {
        const created = await service.createUpload(request.membership, request.body)
        return reply.code(201).send(created)
      },
    )
    app.post(
      '/leagues/:leagueId/uploads/:uploadId/complete',
      {
        preHandler: [authenticate, requireLeagueRole('member')],
        schema: {
          params: uploadParamsSchema,
          body: completeUploadBodySchema,
          response: { 202: uploadStateSchema },
        },
      },
      async (request, reply) => {
        const state = await service.completeUpload(
          request.membership,
          request.params.uploadId,
          request.body,
        )
        return reply.code(202).send(state)
      },
    )
    app.get(
      '/leagues/:leagueId/uploads/:uploadId',
      {
        preHandler: [authenticate, requireLeagueRole('member')],
        schema: { params: uploadParamsSchema, response: { 200: uploadStateSchema } },
      },
      (request) => service.getUploadState(request.membership, request.params.uploadId),
    )
  }
}
