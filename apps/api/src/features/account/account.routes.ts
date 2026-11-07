import { accountDeletionPreviewSchema, deleteAccountBodySchema } from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { perUserRateLimit, rateLimits } from '../../http/rate-limit'
import type { AccountService } from './account.service'

/** Registers the account deletion preview and the self-service account deletion routes. */
export function accountRoutes(service: AccountService): FastifyPluginAsyncZod {
  return async (app) => {
    const accountDeleteLimit = perUserRateLimit(app, 'account-delete', rateLimits.accountDelete)
    app.get(
      '/me/account-deletion',
      {
        preHandler: authenticate,
        schema: { response: { 200: accountDeletionPreviewSchema } },
      },
      (request) => service.getDeletionPreview(request.authSession),
    )
    app.delete(
      '/me',
      {
        preHandler: [authenticate, accountDeleteLimit],
        config: { rateLimit: rateLimits.accountDelete },
        schema: { body: deleteAccountBodySchema },
      },
      async (request, reply) => {
        await service.deleteAccount(request.authSession, request.body)
        const cookies = await request.server.authGateway.expiredSessionCookies()
        return reply.code(204).header('set-cookie', cookies).send()
      },
    )
  }
}
