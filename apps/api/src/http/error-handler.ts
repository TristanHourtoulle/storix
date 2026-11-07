import type { ApiError } from '@storix/shared'
import type { FastifyError, FastifyInstance } from 'fastify'
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod'
import { AppError } from '../lib/errors'

function body(
  code: ApiError['error']['code'],
  message: string,
  details?: Record<string, unknown>,
): ApiError {
  return { error: details === undefined ? { code, message } : { code, message, details } }
}

function isFastifyError(error: unknown): error is FastifyError {
  return error instanceof Error && 'statusCode' in error
}

/** Registers the JSON error handler and, unless the static handler owns it, the not-found handler. */
export function registerErrorHandling(
  app: FastifyInstance,
  options: { handleNotFound: boolean } = { handleNotFound: true },
): void {
  app.setErrorHandler((error: unknown, request, reply) => {
    if (error instanceof AppError) {
      if (error.status >= 500) request.log.error({ err: error, reqId: request.id }, error.message)
      return reply.status(error.status).send(body(error.code, error.message, error.details))
    }
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply
        .status(400)
        .send(body('VALIDATION_FAILED', 'Invalid request', { issues: error.validation }))
    }
    if (isFastifyError(error) && error.validation !== undefined) {
      return reply
        .status(400)
        .send(body('VALIDATION_FAILED', 'Invalid request', { issues: error.validation }))
    }
    if (isFastifyError(error) && error.statusCode === 429) {
      return reply.status(429).send(body('RATE_LIMITED', 'Too many requests'))
    }
    if (isFastifyError(error) && error.statusCode !== undefined && error.statusCode < 500) {
      return reply.status(error.statusCode).send(body('VALIDATION_FAILED', 'Invalid request'))
    }
    request.log.error({ err: error, reqId: request.id }, 'Unhandled error')
    return reply.status(500).send(body('INTERNAL_ERROR', 'Internal server error'))
  })

  if (!options.handleNotFound) return

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/') || request.url === '/api') {
      return reply.status(404).send(body('NOT_FOUND', 'Route not found'))
    }
    return reply.status(404).send()
  })
}
