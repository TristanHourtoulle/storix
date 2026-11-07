import type { LoggerOptions } from 'pino'
import type { Env } from '../config/env'

const SECRET_PATH_PATTERN = /(\/api\/invitations\/|\/join\/)[^/?#\s]+/g
const MEDIA_SIGNATURE_PATTERN = /(\/media\/[0-9]+\/)[0-9a-f]+/g

interface LoggedRequest {
  method: string
  url: string
  host?: string
  ip?: string
  socket?: { remotePort?: number }
}

/** Replaces invitation tokens and media signatures in a URL or log message with a placeholder. */
export function redactUrl(url: string): string {
  return url
    .replace(SECRET_PATH_PATTERN, '$1[redacted]')
    .replace(MEDIA_SIGNATURE_PATTERN, '$1[redacted]')
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
    hooks: {
      logMethod(args, method) {
        const redacted = args.map((arg) => (typeof arg === 'string' ? redactUrl(arg) : arg))
        method.apply(this, redacted as Parameters<typeof method>)
      },
    },
    ...(env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss.l' } } }
      : {}),
  }
}
