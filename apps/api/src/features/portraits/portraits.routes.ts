import {
  avatarUploadParamsSchema,
  completePortraitUploadBodySchema,
  createUploadBodySchema,
  createUploadResponseSchema,
  leagueParamsSchema,
  uploadParamsSchema,
  uploadStateSchema,
} from '@storix/shared'
import type { FastifyRequest } from 'fastify'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { perUserRateLimit, rateLimits } from '../../http/rate-limit'
import type { PortraitTarget, PortraitsService } from './portraits.service'

function avatarOf(request: FastifyRequest): PortraitTarget {
  return { kind: 'avatar', userId: request.authSession.userId }
}

function leaguePhotoOf(request: FastifyRequest): PortraitTarget {
  return { kind: 'league', leagueId: request.membership.leagueId, userId: request.membership.userId }
}

/** Registers the avatar and league photo upload, status and removal routes. */
export function portraitsRoutes(service: PortraitsService): FastifyPluginAsyncZod {
  return async (app) => {
    const portraitLimit = perUserRateLimit(app, 'portrait-upload', rateLimits.displayNameChange)
    const leagueAdmin = [authenticate, requireLeagueRole('admin')]

    app.post(
      '/me/avatar/uploads',
      {
        preHandler: [authenticate, portraitLimit],
        config: { rateLimit: rateLimits.uploadCreate },
        schema: { body: createUploadBodySchema, response: { 201: createUploadResponseSchema } },
      },
      async (request, reply) => {
        const created = await service.createUpload(avatarOf(request), request.body)
        return reply.code(201).send(created)
      },
    )
    app.post(
      '/me/avatar/uploads/:uploadId/complete',
      {
        preHandler: authenticate,
        config: { rateLimit: rateLimits.uploadEdit },
        schema: {
          params: avatarUploadParamsSchema,
          body: completePortraitUploadBodySchema,
          response: { 202: uploadStateSchema },
        },
      },
      async (request, reply) => {
        const state = await service.completeUpload(avatarOf(request), request.params.uploadId)
        return reply.code(202).send(state)
      },
    )
    app.get(
      '/me/avatar/uploads/:uploadId',
      {
        preHandler: authenticate,
        config: { rateLimit: rateLimits.uploadEdit },
        schema: { params: avatarUploadParamsSchema, response: { 200: uploadStateSchema } },
      },
      (request) => service.getUploadState(avatarOf(request), request.params.uploadId),
    )
    app.delete(
      '/me/avatar',
      {
        preHandler: [authenticate, portraitLimit],
        config: { rateLimit: rateLimits.displayNameChangeIp },
      },
      async (request, reply) => {
        await service.removeAvatar(request.authSession.userId)
        return reply.code(204).send()
      },
    )

    app.post(
      '/leagues/:leagueId/photo/uploads',
      {
        preHandler: leagueAdmin,
        config: { rateLimit: rateLimits.adminAction },
        schema: {
          params: leagueParamsSchema,
          body: createUploadBodySchema,
          response: { 201: createUploadResponseSchema },
        },
      },
      async (request, reply) => {
        const created = await service.createUpload(leaguePhotoOf(request), request.body)
        return reply.code(201).send(created)
      },
    )
    app.post(
      '/leagues/:leagueId/photo/uploads/:uploadId/complete',
      {
        preHandler: leagueAdmin,
        config: { rateLimit: rateLimits.uploadEdit },
        schema: {
          params: uploadParamsSchema,
          body: completePortraitUploadBodySchema,
          response: { 202: uploadStateSchema },
        },
      },
      async (request, reply) => {
        const state = await service.completeUpload(leaguePhotoOf(request), request.params.uploadId)
        return reply.code(202).send(state)
      },
    )
    app.get(
      '/leagues/:leagueId/photo/uploads/:uploadId',
      {
        preHandler: leagueAdmin,
        config: { rateLimit: rateLimits.uploadEdit },
        schema: { params: uploadParamsSchema, response: { 200: uploadStateSchema } },
      },
      (request) => service.getUploadState(leaguePhotoOf(request), request.params.uploadId),
    )
    app.delete(
      '/leagues/:leagueId/photo',
      {
        preHandler: leagueAdmin,
        config: { rateLimit: rateLimits.adminAction },
        schema: { params: leagueParamsSchema },
      },
      async (request, reply) => {
        await service.removeLeaguePhoto(request.membership)
        return reply.code(204).send()
      },
    )
  }
}
