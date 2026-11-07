import type { FastifyRequest } from 'fastify'
import type { AuthGateway, AuthSession } from '../auth/auth.gateway'
import { unauthenticated } from '../lib/errors'

declare module 'fastify' {
  interface FastifyInstance {
    authGateway: AuthGateway
  }
  interface FastifyRequest {
    authSession: AuthSession
    optionalAuthSession: AuthSession | null
  }
}

/** Route preHandler that requires a valid Better Auth session and exposes it on the request. */
export async function authenticate(request: FastifyRequest): Promise<void> {
  const session = await request.server.authGateway.getSessionFromNodeHeaders(request.headers)
  if (session === null) throw unauthenticated()
  request.authSession = session
}

/** Route preHandler that exposes the Better Auth session when present, or null, without requiring it. */
export async function optionalAuthenticate(request: FastifyRequest): Promise<void> {
  request.optionalAuthSession = await request.server.authGateway.getSessionFromNodeHeaders(
    request.headers,
  )
}
