import { pino, type Logger } from 'pino'
import type { WorkerEnv } from '../config/env'

export type WorkerLogger = Pick<Logger, 'debug' | 'info' | 'warn' | 'error'>

/** Creates the worker pino logger for the given environment. */
export function createLogger(env: WorkerEnv): Logger {
  return pino({
    level: env.LOG_LEVEL,
    base: { service: 'worker' },
    ...(env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss.l' } } }
      : {}),
  })
}
