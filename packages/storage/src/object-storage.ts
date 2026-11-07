import type { Readable } from 'node:stream'
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import type { StorageEnv } from './config'

const DELETE_CHUNK_SIZE = 1000
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
  getStream(key: string): Promise<{
    body: Readable
    contentType: string | null
    contentLength: number | null
    etag: string | null
  } | null>
  getBuffer(key: string, maxBytes: number): Promise<Buffer | null>
  put(input: {
    key: string
    body: Buffer
    contentType: string
    cacheControl: string
  }): Promise<void>
  delete(keys: readonly string[]): Promise<void>
  setCors(origins: readonly string[]): Promise<void>
}

function isMissing(error: unknown): boolean {
  if (!(error instanceof S3ServiceException)) return false
  return (
    error.name === 'NoSuchKey' ||
    error.name === 'NotFound' ||
    error.$metadata.httpStatusCode === 404
  )
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

async function readCapped(body: Readable, maxBytes: number): Promise<Buffer | null> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of body) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array)
    total += buffer.length
    if (total > maxBytes) {
      body.destroy()
      return null
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
        if (!result.Body) throw new Error(`Empty body for object ${key}`)
        return {
          body: result.Body as Readable,
          contentType: result.ContentType ?? null,
          contentLength: result.ContentLength ?? null,
          etag: result.ETag ?? null,
        }
      }),

    getBuffer: (key, maxBytes) =>
      orNull(async () => {
        const result = await client.send(new GetObjectCommand({ Bucket, Key: key }))
        if (!result.Body) throw new Error(`Empty body for object ${key}`)
        if (result.ContentLength !== undefined && result.ContentLength > maxBytes) return null
        return readCapped(result.Body as Readable, maxBytes)
      }).then((buffer) => buffer ?? null),

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
        await client.send(
          new DeleteObjectsCommand({
            Bucket,
            Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
          }),
        )
      }
    },

    setCors: async (origins) => {
      await client.send(
        new PutBucketCorsCommand({
          Bucket,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedOrigins: [...origins],
                AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD'],
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
