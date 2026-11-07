import type { ErrorCode } from '@storix/shared'

export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details: Record<string, unknown> | undefined

  constructor(
    code: ErrorCode,
    status: number,
    message: string,
    details?: Record<string, unknown>,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.details = details
  }
}

/** Builds a 404 NOT_FOUND error. */
export function notFound(message = 'Resource not found'): AppError {
  return new AppError('NOT_FOUND', 404, message)
}

/** Builds a 403 FORBIDDEN error. */
export function forbidden(message = 'Forbidden'): AppError {
  return new AppError('FORBIDDEN', 403, message)
}

/** Builds a 401 UNAUTHENTICATED error. */
export function unauthenticated(message = 'Authentication required'): AppError {
  return new AppError('UNAUTHENTICATED', 401, message)
}
