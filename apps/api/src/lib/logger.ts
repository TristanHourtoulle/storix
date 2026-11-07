import type { LoggerOptions } from 'pino'
import type { Env } from '../config/env'

const SECRET_PATH_PATTERN = /^(\/api\/invitations\/|\/join\/)[^/?#]+/

interface LoggedRequest {
  method: string
  url: string
  host?: string
  ip?: string
  socket?: { remotePort?: number }
}

/** Replaces the invitation token segment of a request URL with a placeholder. */
export function redactUrl(url: string): string {
  return url.replace(SECRET_PATH_PATTERN, '$1[redacted]')
}

function serializeRequest(request: LoggedRequest): Record<string, unknown> {
  return {
    method: request.method,
    url: redactUrl(request.url),
    host: request.host,
    remoteAddress: request.ip,
    remotePort: request.socket?.remotePort,
  }
}

/** Builds the pino logger options for the given environment. */
export function buildLoggerOptions(env: Env): LoggerOptions {
  return {
    level: env.LOG_LEVEL,
    redact: ['req.headers.cookie', 'req.headers.authorization'],
    serializers: { req: serializeRequest },
    ...(env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss.l' } } }
      : {}),
  }
}
