import {
  pushConfigSchema,
  pushSubscriptionBodySchema,
  pushUnsubscribeBodySchema,
} from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { perUserRateLimit, rateLimits } from '../../http/rate-limit'
import type { PushService } from './push.service'

/** Registers the push config, subscribe and unsubscribe routes. */
export function pushRoutes(service: PushService): FastifyPluginAsyncZod {
  return async (app) => {
    const subscriptionLimit = perUserRateLimit(
      app,
      'push-subscription',
      rateLimits.pushSubscription,
    )
    app.get(
      '/push/config',
      {
        preHandler: authenticate,
        schema: { response: { 200: pushConfigSchema } },
      },
      () => service.getConfig(),
    )
    app.put(
      '/push/subscriptions',
      {
        preHandler: [authenticate, subscriptionLimit],
        config: { rateLimit: rateLimits.pushSubscription },
        schema: { body: pushSubscriptionBodySchema },
      },
      async (request, reply) => {
        await service.subscribe(request.authSession, request.body)
        return reply.code(204).send()
      },
    )
    app.post(
      '/push/subscriptions/remove',
      {
        preHandler: [authenticate, subscriptionLimit],
        config: { rateLimit: rateLimits.pushSubscription },
        schema: { body: pushUnsubscribeBodySchema },
      },
      async (request, reply) => {
        await service.unsubscribe(request.authSession, request.body.endpoint)
        return reply.code(204).send()
      },
    )
  }
}
