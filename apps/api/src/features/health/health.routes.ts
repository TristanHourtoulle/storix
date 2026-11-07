import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { HealthService } from './health.service'

const healthResponseSchema = z.object({ status: z.literal('ok'), db: z.literal('ok') })

/** Registers GET /api/health. */
export function healthRoutes(service: HealthService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/health', { schema: { response: { 200: healthResponseSchema } } }, () =>
      service.check(),
    )
  }
}
