import exifr from 'exifr'
import sharp, { type Sharp } from 'sharp'
import { rgbaToThumbHash } from 'thumbhash'
import {
  MEDIA_FORMATS,
  MEDIA_VARIANT_SIZES,
  PHASH_SIZE,
  type MediaFormat,
  type MediaVariantSize,
} from '@storix/shared/domain'

const MAX_INPUT_PIXELS = 50_000_000
const THUMBHASH_MAX_EDGE = 100
const JPEG_MAGIC = [0xff, 0xd8, 0xff] as const

const CONTENT_TYPES: Record<MediaFormat, string> = { avif: 'image/avif', webp: 'image/webp' }

export interface RenderedFile {
  size: MediaVariantSize
  format: MediaFormat
  body: Buffer
  width: number
  height: number
  contentType: string
}

export interface RenderedImage {
  width: number
  height: number
  thumbhash: string
  dominantColor: string
  files: RenderedFile[]
}

export type ProbeResult =
  | { ok: true; width: number; height: number }
  | { ok: false; reason: 'NOT_JPEG_MAGIC' | 'NOT_JPEG_FORMAT' | 'UNDECODABLE'; detail?: string }

export interface ImagePipeline {
  probeJpeg(buffer: Buffer): Promise<ProbeResult>
  readExifCaptureDate(buffer: Buffer): Promise<Date | null>
  grayscaleForHash(buffer: Buffer): Promise<Uint8Array>
  renderVariants(buffer: Buffer): Promise<RenderedImage>
}

/** Opens an untrusted image with the worker's input limits. */
export function openImage(buffer: Buffer): Sharp {
  return sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' })
}

function hasJpegMagic(buffer: Buffer): boolean {
  return JPEG_MAGIC.every((byte, index) => buffer[index] === byte)
}

function toHex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, '0')
}

/** Applies process-wide sharp settings suited to a background worker. */
export function configureImagePipeline(): void {
  sharp.concurrency(1)
  sharp.cache(false)
}

/** Tells whether the buffer is a fully decodable JPEG and returns its oriented size. */
export async function probeJpeg(buffer: Buffer): Promise<ProbeResult> {
  if (!hasJpegMagic(buffer)) return { ok: false, reason: 'NOT_JPEG_MAGIC' }
  try {
    const metadata = await openImage(buffer).metadata()
    if (metadata.format !== 'jpeg') {
      return { ok: false, reason: 'NOT_JPEG_FORMAT', detail: metadata.format }
    }
    await openImage(buffer).resize(8, 8, { fit: 'fill' }).raw().toBuffer()
    return { ok: true, width: metadata.autoOrient.width, height: metadata.autoOrient.height }
  } catch (error) {
    return {
      ok: false,
      reason: 'UNDECODABLE',
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

/** Reads the EXIF capture date (DateTimeOriginal, then CreateDate); never throws. */
export async function readExifCaptureDate(buffer: Buffer): Promise<Date | null> {
  try {
    const tags: unknown = await exifr.parse(buffer, { pick: ['DateTimeOriginal', 'CreateDate'] })
    if (typeof tags !== 'object' || tags === null) return null
    for (const name of ['DateTimeOriginal', 'CreateDate'] as const) {
      const value: unknown = (tags as Record<string, unknown>)[name]
      if (value instanceof Date && !Number.isNaN(value.getTime())) return value
    }
    return null
  } catch {
    return null
  }
}

/** Renders the oriented image as the 32x32 grayscale bytes expected by the perceptual hash. */
export async function grayscaleForHash(buffer: Buffer): Promise<Uint8Array> {
  const data = await openImage(buffer)
    .rotate()
    .grayscale()
    .resize(PHASH_SIZE, PHASH_SIZE, { fit: 'fill' })
    .raw()
    .toBuffer()
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
}

async function renderPlaceholder(
  buffer: Buffer,
): Promise<{ thumbhash: string; dominantColor: string }> {
  const { data, info } = await openImage(buffer)
    .rotate()
    .resize(THUMBHASH_MAX_EDGE, THUMBHASH_MAX_EDGE, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const hash = rgbaToThumbHash(info.width, info.height, data)
  const { dominant } = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).stats()
  return {
    thumbhash: Buffer.from(hash).toString('base64'),
    dominantColor: `#${toHex(dominant.r)}${toHex(dominant.g)}${toHex(dominant.b)}`,
  }
}

/** Resizes an image to fit a variant size and encodes it with the shared AVIF/WebP settings. */
export async function encodeFile(
  image: Sharp,
  size: MediaVariantSize,
  format: MediaFormat,
): Promise<RenderedFile> {
  const resized = image.resize({
    width: size,
    height: size,
    fit: 'inside',
    withoutEnlargement: true,
  })
  const encoded =
    format === 'avif' ? resized.avif({ quality: 50, effort: 4 }) : resized.webp({ quality: 78 })
  const { data, info } = await encoded.toBuffer({ resolveWithObject: true })
  return {
    size,
    format,
    body: data,
    width: info.width,
    height: info.height,
    contentType: CONTENT_TYPES[format],
  }
}

function renderFile(
  buffer: Buffer,
  size: MediaVariantSize,
  format: MediaFormat,
): Promise<RenderedFile> {
  return encodeFile(openImage(buffer).rotate(), size, format)
}

/** Renders every AVIF/WebP variant, the thumbhash and the dominant color, without metadata. */
export async function renderVariants(buffer: Buffer): Promise<RenderedImage> {
  const metadata = await openImage(buffer).metadata()
  const placeholder = await renderPlaceholder(buffer)
  const files: RenderedFile[] = []
  for (const size of MEDIA_VARIANT_SIZES) {
    for (const format of MEDIA_FORMATS) {
      files.push(await renderFile(buffer, size, format))
    }
  }
  return {
    width: metadata.autoOrient.width,
    height: metadata.autoOrient.height,
    ...placeholder,
    files,
  }
}

export const imagePipeline: ImagePipeline = {
  probeJpeg,
  readExifCaptureDate,
  grayscaleForHash,
  renderVariants,
}
