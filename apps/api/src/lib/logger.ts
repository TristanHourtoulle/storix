import type { LoggerOptions } from 'pino'
import type { Env } from '../config/env'

/** Builds the pino logger options for the given environment. */
export function buildLoggerOptions(env: Env): LoggerOptions {
  return {
    level: env.LOG_LEVEL,
    redact: ['req.headers.cookie', 'req.headers.authorization'],
    ...(env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss.l' } } }
      : {}),
  }
}
