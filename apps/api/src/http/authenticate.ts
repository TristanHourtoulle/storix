import type { FastifyRequest } from 'fastify'
import type { AuthGateway, AuthSession } from '../auth/auth.gateway'
import { unauthenticated } from '../lib/errors'

declare module 'fastify' {
  interface FastifyInstance {
    authGateway: AuthGateway
  }
  interface FastifyRequest {
    authSession: AuthSession
  }
}

/** Route preHandler that requires a valid Better Auth session and exposes it on the request. */
export async function authenticate(request: FastifyRequest): Promise<void> {
  const session = await request.server.authGateway.getSessionFromNodeHeaders(request.headers)
  if (session === null) throw unauthenticated()
  request.authSession = session
}
