type LogContext = Record<string, unknown>

const isProduction = import.meta.env.PROD

/** Console wrapper; debug and info are silenced in production. */
export const logger = {
  debug(message: string, context?: LogContext): void {
    if (!isProduction) console.debug(message, context ?? {})
  },
  info(message: string, context?: LogContext): void {
    if (!isProduction) console.info(message, context ?? {})
  },
  warn(message: string, context?: LogContext): void {
    console.warn(message, context ?? {})
  },
  error(message: string, context?: LogContext): void {
    console.error(message, context ?? {})
  },
}
