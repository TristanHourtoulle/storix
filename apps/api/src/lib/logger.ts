import { stdSerializers, type LoggerOptions } from 'pino'
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

const MAX_CAUSE_DEPTH = 5
const SQLSTATE_PATTERN = /^[0-9A-Z]{5}$/

function isDatabaseError(error: object): boolean {
  if ('query' in error && 'params' in error) return true
  if (error instanceof Error && error.message.startsWith('Failed query:')) return true
  return (
    'severity' in error &&
    'code' in error &&
    typeof error.code === 'string' &&
    SQLSTATE_PATTERN.test(error.code)
  )
}

function causeChain(error: unknown): object[] {
  const chain: object[] = []
  let current: unknown = error
  while (typeof current === 'object' && current !== null && chain.length < MAX_CAUSE_DEPTH) {
    chain.push(current)
    current = 'cause' in current ? current.cause : undefined
  }
  return chain
}

function errorName(error: object): string | undefined {
  return error instanceof Error ? error.name : undefined
}

function stringCode(error: object): string | undefined {
  return 'code' in error && typeof error.code === 'string' ? error.code : undefined
}

function databaseCode(chain: object[]): string | undefined {
  const codes = chain.filter(isDatabaseError).map(stringCode)
  return (
    codes.find((code) => code !== undefined) ??
    chain.map(stringCode).find((code) => code !== undefined)
  )
}

/**
 * Serializes a logged error. Database errors embed SQL parameters (push endpoints, keys, user data)
 * in their message, stack and fields, so they are reduced to their name and driver code.
 */
export function serializeLoggedError(error: unknown): unknown {
  const chain = causeChain(error)
  const [outer] = chain
  if (outer === undefined || !chain.some(isDatabaseError)) {
    return error instanceof Error ? stdSerializers.err(error) : error
  }
  return { type: errorName(outer), code: databaseCode(chain), database: true }
}

/** Builds the pino logger options for the given environment. */
export function buildLoggerOptions(env: Env): LoggerOptions {
  return {
    level: env.LOG_LEVEL,
    redact: ['req.headers.cookie', 'req.headers.authorization'],
    serializers: { req: serializeRequest, err: serializeLoggedError },
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
