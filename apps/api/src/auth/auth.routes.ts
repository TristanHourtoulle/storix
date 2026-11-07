import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { fromNodeHeaders } from 'better-auth/node'
import { rateLimits } from '../http/rate-limit'
import { notFound } from '../lib/errors'
import type { AuthGateway } from './auth.gateway'

const AUTH_PREFIX = '/api/auth/'

const ALLOWED_PATHS: ReadonlySet<string> = new Set(
  [
    'get-session',
    'sign-in/username',
    'sign-out',
    'change-password',
    'list-sessions',
    'revoke-session',
    'revoke-sessions',
    'revoke-other-sessions',
  ].map((path) => `${AUTH_PREFIX}${path}`),
)

const ALLOWED_PREFIXES: readonly string[] = [`${AUTH_PREFIX}passkey/`]

const SKIPPED_RESPONSE_HEADERS: ReadonlySet<string> = new Set([
  'set-cookie',
  'content-length',
  'content-encoding',
  'transfer-encoding',
  'connection',
])

function isAllowed(pathname: string): boolean {
  return (
    ALLOWED_PATHS.has(pathname) ||
    ALLOWED_PREFIXES.some(
      (prefix) => pathname.startsWith(prefix) && pathname.length > prefix.length,
    )
  )
}

function toFetchRequest(request: FastifyRequest, url: URL): Request {
  const hasBody = request.body !== undefined && request.body !== null
  return new Request(url, {
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
        const url = new URL(request.url, appOrigin)
        if (!isAllowed(url.pathname)) throw notFound('Route not found')
        const response = await gateway.handle(toFetchRequest(request, url))
        return sendFetchResponse(reply, response)
      },
    })
  }
}
