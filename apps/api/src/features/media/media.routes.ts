import type { FastifyPluginAsync } from 'fastify'
import type { MediaService } from './media.service'

function pathnameOf(url: string): string {
  return url.split('?')[0] ?? url
}

/** Registers GET /media/* serving signed media objects without any session lookup. */
export function mediaRoutes(service: MediaService): FastifyPluginAsync {
  return async (app) => {
    app.get('/media/*', async (request, reply) => {
      const media = await service.open(pathnameOf(request.url))
      reply
        .header('Content-Type', media.contentType)
        .header('Cache-Control', `public, max-age=${media.maxAgeSeconds}, immutable`)
        .header('X-Content-Type-Options', 'nosniff')
      if (media.contentLength !== null) reply.header('Content-Length', media.contentLength)
      if (media.etag !== null) reply.header('ETag', media.etag)
      return reply.send(media.stream)
    })
  }
}
