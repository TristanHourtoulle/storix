import type { FastifyInstance, FastifyRequest } from 'fastify'
import { AppError } from '../lib/errors'

export const rateLimits = {
  auth: { max: 60, timeWindow: '1 minute' },
  invitationPublic: { max: 10, timeWindow: '1 minute' },
  invitationCreate: { max: 20, timeWindow: '1 hour' },
  resetRedeem: { max: 5, timeWindow: '15 minutes' },
  resetIssue: { max: 10, timeWindow: '1 hour' },
  uploadCreate: { max: 60, timeWindow: '1 minute' },
  uploadEdit: { max: 240, timeWindow: '1 minute' },
  uploadPublish: { max: 20, timeWindow: '1 minute' },
  boosterOpen: { max: 30, timeWindow: '1 minute' },
  cardAction: { max: 60, timeWindow: '1 minute' },
  stackAction: { max: 30, timeWindow: '1 minute' },
  stackActionUser: { max: 20, timeWindow: '1 minute' },
  adminAction: { max: 60, timeWindow: '1 minute' },
  accountDelete: { max: 5, timeWindow: '15 minutes' },
  displayNameChange: { max: 10, timeWindow: '1 hour' },
  displayNameChangeIp: { max: 60, timeWindow: '1 hour' },
  pushSubscription: { max: 20, timeWindow: '1 hour' },
  pushSubscriptionIp: { max: 120, timeWindow: '1 hour' },
} as const

export interface RateLimit {
  max: number
  timeWindow: string
}

/** Builds a preHandler limiting a route per authenticated user, on top of its per-IP limit; it must run after `authenticate`. */
export function perUserRateLimit(
  app: FastifyInstance,
  name: string,
  limit: RateLimit,
): (request: FastifyRequest) => Promise<void> {
  const check = app.createRateLimit({
    ...limit,
    keyGenerator: (request) => `${name}:user:${request.authSession.userId}`,
  })
  return async (request) => {
    const result = await check(request)
    if (!result.isAllowed && result.isExceeded) {
      throw new AppError('RATE_LIMITED', 429, 'Too many requests', {
        retryAfter: `${result.ttlInSeconds} seconds`,
      })
    }
  }
}
