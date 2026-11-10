import { onboardingStateSchema } from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { perUserRateLimit, rateLimits } from '../../http/rate-limit'
import type { OnboardingService } from './onboarding.service'

/** Registers the onboarding state and mark-seen routes. */
export function onboardingRoutes(service: OnboardingService): FastifyPluginAsyncZod {
  return async (app) => {
    const seenLimit = perUserRateLimit(app, 'onboarding-seen', rateLimits.onboardingSeen)
    app.get(
      '/onboarding',
      { preHandler: authenticate, schema: { response: { 200: onboardingStateSchema } } },
      (request) => service.getState(request.authSession),
    )
    app.post(
      '/onboarding/seen',
      {
        preHandler: [authenticate, seenLimit],
        config: { rateLimit: rateLimits.onboardingSeenIp },
        schema: { response: { 200: onboardingStateSchema } },
      },
      (request) => service.markSeen(request.authSession),
    )
  }
}
