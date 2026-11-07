import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { fromNodeHeaders } from 'better-auth/node'
import { rateLimits } from '../http/rate-limit'
import { notFound } from '../lib/errors'
import type { AuthGateway } from './auth.gateway'

const BLOCKED_PREFIXES: readonly string[] = [
  '/api/auth/sign-up',
  '/api/auth/request-password-reset',
  '/api/auth/reset-password',
  '/api/auth/change-email',
  '/api/auth/send-verification-email',
  '/api/auth/verify-email',
]

const SKIPPED_RESPONSE_HEADERS: ReadonlySet<string> = new Set([
  'set-cookie',
  'content-length',
  'content-encoding',
  'transfer-encoding',
  'connection',
])

function isBlocked(pathname: string): boolean {
  return BLOCKED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))
}

function toFetchRequest(request: FastifyRequest, appOrigin: string): Request {
  const hasBody = request.body !== undefined && request.body !== null
  return new Request(new URL(request.url, appOrigin), {
    method: request.method,
    headers: fromNodeHeaders(request.headers),
    ...(hasBody ? { body: JSON.stringify(request.body) } : {}),
  })
}

async function sendFetchResponse(reply: FastifyReply, response: Response): Promise<FastifyReply> {
  const headers = Object.fromEntries(
    [...response.headers.entries()].filter(([name]) => !SKIPPED_RESPONSE_HEADERS.has(name)),
  )
  const cookies = response.headers.getSetCookie()
  const text = await response.text()
  reply.status(response.status).headers(headers)
  if (cookies.length > 0) reply.header('set-cookie', cookies)
  return reply.send(text.length > 0 ? text : undefined)
}

/** Mounts the Better Auth handler on /api/auth/* behind the auth rate limit. */
export function authRoutes(gateway: AuthGateway, appOrigin: string): FastifyPluginAsync {
  return async (app) => {
    app.route({
      method: ['GET', 'POST'],
      url: '/api/auth/*',
      config: { rateLimit: rateLimits.auth },
      async handler(request, reply) {
        const { pathname } = new URL(request.url, appOrigin)
        if (isBlocked(pathname)) throw notFound('Route not found')
        const response = await gateway.handle(toFetchRequest(request, appOrigin))
        return sendFetchResponse(reply, response)
      },
    })
  }
}
