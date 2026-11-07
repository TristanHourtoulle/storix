import { Readable } from 'node:stream'
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import type { StoredObject } from '@storix/shared/domain'
import type { StorageEnv } from './config'

const DELETE_CHUNK_SIZE = 1000
const LIST_PAGE_SIZE = 1000
const CORS_MAX_AGE_SECONDS = 3600

export interface PresignUploadInput {
  key: string
  contentType: string
  minBytes: number
  maxBytes: number
  cacheControl: string
  expiresInSeconds: number
}

export interface PresignedUpload {
  url: string
  fields: Record<string, string>
}

export interface ObjectStorage {
  readonly uploadOrigin: string
  presignUpload(input: PresignUploadInput): Promise<PresignedUpload>
  head(key: string): Promise<{ contentLength: number; contentType: string | null } | null>
  /** Callers must fully consume or destroy the returned body stream. */
  getStream(key: string): Promise<{
    body: Readable
    contentType: string | null
    contentLength: number | null
    etag: string | null
  } | null>
  /** Resolves null when the object is missing and rejects with ObjectTooLargeError above maxBytes. */
  getBuffer(key: string, maxBytes: number): Promise<Buffer | null>
  put(input: {
    key: string
    body: Buffer
    contentType: string
    cacheControl: string
  }): Promise<void>
  delete(keys: readonly string[]): Promise<void>
  setCors(origins: readonly string[]): Promise<void>
  /** Lists every object under a prefix, following pagination. */
  list(prefix: string): AsyncIterable<StoredObject>
}

function isMissing(error: unknown): boolean {
  return (
    error instanceof S3ServiceException && (error.name === 'NoSuchKey' || error.name === 'NotFound')
  )
}

/** Thrown when an object exceeds the byte cap requested by the caller. */
export class ObjectTooLargeError extends Error {
  constructor(
    readonly key: string,
    readonly maxBytes: number,
  ) {
    super(`Object ${key} exceeds ${maxBytes} bytes`)
    this.name = 'ObjectTooLargeError'
  }
}

function toReadable(body: unknown, key: string): Readable {
  if (!(body instanceof Readable)) throw new Error(`Unexpected body type for object ${key}`)
  return body
}

async function orNull<T>(operation: () => Promise<T>): Promise<T | null> {
  try {
    return await operation()
  } catch (error) {
    if (isMissing(error)) return null
    throw error
  }
}

function computeUploadOrigin(env: StorageEnv): string {
  const endpoint = new URL(env.S3_ENDPOINT)
  if (env.S3_FORCE_PATH_STYLE) return endpoint.origin
  return `${endpoint.protocol}//${env.S3_BUCKET}.${endpoint.host}`
}

async function readCapped(body: Readable, key: string, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of body) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array)
    total += buffer.length
    if (total > maxBytes) {
      body.destroy()
      throw new ObjectTooLargeError(key, maxBytes)
    }
    chunks.push(buffer)
  }
  return Buffer.concat(chunks)
}

/** Creates an S3-compatible object storage gateway bound to a single bucket. */
export function createObjectStorage(env: StorageEnv): ObjectStorage {
  const Bucket = env.S3_BUCKET
  const client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  })

  return {
    uploadOrigin: computeUploadOrigin(env),

    presignUpload: (input) =>
      createPresignedPost(client, {
        Bucket,
        Key: input.key,
        Expires: input.expiresInSeconds,
        Fields: { 'Content-Type': input.contentType, 'Cache-Control': input.cacheControl },
        Conditions: [
          ['content-length-range', input.minBytes, input.maxBytes],
          ['eq', '$Content-Type', input.contentType],
          ['eq', '$Cache-Control', input.cacheControl],
        ],
      }),

    head: (key) =>
      orNull(async () => {
        const result = await client.send(new HeadObjectCommand({ Bucket, Key: key }))
        return {
          contentLength: result.ContentLength ?? 0,
          contentType: result.ContentType ?? null,
        }
      }),

    getStream: (key) =>
      orNull(async () => {
        const result = await client.send(new GetObjectCommand({ Bucket, Key: key }))
        const body = toReadable(result.Body, key)
        return {
          body,
          contentType: result.ContentType ?? null,
          contentLength: result.ContentLength ?? null,
          etag: result.ETag ?? null,
        }
      }),

    getBuffer: (key, maxBytes) =>
      orNull(async () => {
        const result = await client.send(new GetObjectCommand({ Bucket, Key: key }))
        const body = toReadable(result.Body, key)
        if (result.ContentLength !== undefined && result.ContentLength > maxBytes) {
          body.destroy()
          throw new ObjectTooLargeError(key, maxBytes)
        }
        return readCapped(body, key, maxBytes)
      }),

    put: async (input) => {
      await client.send(
        new PutObjectCommand({
          Bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
          CacheControl: input.cacheControl,
        }),
      )
    },

    delete: async (keys) => {
      for (let index = 0; index < keys.length; index += DELETE_CHUNK_SIZE) {
        const chunk = keys.slice(index, index + DELETE_CHUNK_SIZE)
        const result = await client.send(
          new DeleteObjectsCommand({
            Bucket,
            Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
          }),
        )
        const failed = (result.Errors ?? []).map((item) => item.Key ?? '?')
        if (failed.length > 0) throw new Error(`Failed to delete objects: ${failed.join(', ')}`)
      }
    },

    list: async function* (prefix) {
      let continuationToken: string | undefined
      do {
        const page = await client.send(
          new ListObjectsV2Command({
            Bucket,
            Prefix: prefix,
            MaxKeys: LIST_PAGE_SIZE,
            ContinuationToken: continuationToken,
          }),
        )
        for (const item of page.Contents ?? []) {
          if (item.Key === undefined || item.LastModified === undefined) continue
          yield { key: item.Key, lastModified: item.LastModified }
        }
        continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined
      } while (continuationToken !== undefined)
    },

    setCors: async (origins) => {
      await client.send(
        new PutBucketCorsCommand({
          Bucket,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedOrigins: [...origins],
                AllowedMethods: ['GET', 'POST', 'HEAD'],
                AllowedHeaders: ['*'],
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: CORS_MAX_AGE_SECONDS,
              },
            ],
          },
        }),
      )
    },
  }
}
