import { extname, relative, sep } from 'node:path'
import fastifyStatic from '@fastify/static'
import type { FastifyInstance } from 'fastify'

const IMMUTABLE = 'public, max-age=31536000, immutable'
const NO_CACHE = 'no-cache'
const NO_STORE = 'no-store'
const REVALIDATED_FILES = new Set(['sw.js', 'index.html', 'manifest.webmanifest'])
const RESERVED_PREFIXES = ['/api', '/media']

function isReserved(url: string): boolean {
  const path = url.split('?')[0] ?? url
  return RESERVED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

function cacheControlFor(relativePath: string): string | undefined {
  if (relativePath.startsWith('assets/')) return IMMUTABLE
  if (REVALIDATED_FILES.has(relativePath)) return NO_CACHE
  return undefined
}

/** Serves the built web app with cache headers and an HTML-only SPA fallback. */
export async function registerStatic(app: FastifyInstance, distDir: string): Promise<void> {
  await app.register(fastifyStatic, {
    root: distDir,
    wildcard: false,
    index: ['index.html'],
    setHeaders: (reply, filePath) => {
      const relativePath = relative(distDir, filePath).split(sep).join('/')
      const cacheControl = cacheControlFor(relativePath)
      if (cacheControl !== undefined) reply.header('Cache-Control', cacheControl)
    },
  })

  app.setNotFoundHandler(async (request, reply) => {
    if (isReserved(request.url)) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Route not found' } })
    }
    reply.header('Vary', 'Accept')
    const accept = request.headers.accept ?? ''
    const isDocumentRequest =
      (request.method === 'GET' || request.method === 'HEAD') && accept.includes('text/html')
    const path = request.url.split('?')[0] ?? request.url
    if (isDocumentRequest && extname(path) === '') {
      return reply
        .header('Cache-Control', NO_CACHE)
        .type('text/html; charset=utf-8')
        .sendFile('index.html')
    }
    return reply.status(404).header('Cache-Control', NO_STORE).send()
  })
}
