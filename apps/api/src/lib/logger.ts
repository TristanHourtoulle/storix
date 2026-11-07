import type { FastifyServerOptions } from 'fastify'
import type { Env } from '../config/env'

/** Builds the Fastify pino logger options for the given environment. */
export function buildLoggerOptions(env: Env): NonNullable<FastifyServerOptions['logger']> {
  return {
    level: env.LOG_LEVEL,
    redact: ['req.headers.cookie', 'req.headers.authorization'],
    ...(env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss.l' } } }
      : {}),
  }
}
