import type { Readable } from 'node:stream'
import { mediaMaxAgeSeconds, parseMediaPath } from '@storix/shared'
import type { ObjectStorage } from '@storix/storage'
import { forbidden, notFound } from '../../lib/errors'
import type { MediaSigner } from '../../lib/media-signer'

export interface MediaObject {
  stream: Readable
  contentType: string
  contentLength: number | null
  etag: string | null
  maxAgeSeconds: number
}

export interface MediaService {
  open(pathname: string): Promise<MediaObject>
}

function contentTypeFor(objectKey: string): string {
  return objectKey.endsWith('.avif') ? 'image/avif' : 'image/webp'
}

/** Builds the media service resolving signed media paths to storage streams. */
export function createMediaService(deps: {
  storage: ObjectStorage
  signer: MediaSigner
  clock: () => Date
}): MediaService {
  return {
    async open(pathname) {
      const parsed = parseMediaPath(pathname)
      if (parsed === null || !deps.signer.verify(parsed)) throw forbidden()
      const object = await deps.storage.getStream(parsed.objectKey)
      if (object === null) throw notFound()
      return {
        stream: object.body,
        contentType: contentTypeFor(parsed.objectKey),
        contentLength: object.contentLength,
        etag: object.etag,
        maxAgeSeconds: mediaMaxAgeSeconds(parsed.windowStart, deps.clock()),
      }
    },
  }
}
