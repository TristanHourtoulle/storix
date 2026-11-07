import type { FastifyInstance } from 'fastify'
import { AppError } from '../lib/errors'

const UNSAFE_METHODS: ReadonlySet<string> = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/** Rejects unsafe /api/* requests whose Origin header differs from the app origin. */
export function registerOriginCheck(app: FastifyInstance, appOrigin: string): void {
  const expected = new URL(appOrigin).origin
  app.addHook('onRequest', async (request) => {
    if (!UNSAFE_METHODS.has(request.method) || !request.url.startsWith('/api/')) return
    if (request.headers.origin !== expected) {
      throw new AppError('CSRF_ORIGIN_MISMATCH', 403, 'Origin not allowed')
    }
  })
}
