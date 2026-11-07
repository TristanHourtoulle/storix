import { CLIENT_MAX_EDGE_PX, UPLOAD_CONTENT_TYPE, sanitizeCaptureDate } from '@storix/shared'
import { parse } from 'exifr'
import { UserFacingError } from '@/features/errors/user-message'

const JPEG_QUALITY = 0.9
const UNSUPPORTED_MESSAGE = 'Format non pris en charge sur cet appareil.'

export interface PreparedPhoto {
  blob: Blob
  width: number
  height: number
  capturedAt: string | null
  previewUrl: string
}

interface DecodedImage {
  source: CanvasImageSource
  width: number
  height: number
  release: () => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function readCaptureDate(file: File): Promise<string | null> {
  try {
    const tags: unknown = await parse(file, { pick: ['DateTimeOriginal'] })
    const raw = isRecord(tags) ? tags.DateTimeOriginal : undefined
    if (!(raw instanceof Date)) return null
    return sanitizeCaptureDate(raw, new Date())?.toISOString() ?? null
  } catch {
    return null
  }
}

async function decodeWithBitmap(file: File): Promise<DecodedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    release: () => bitmap.close(),
  }
}

async function decodeWithElement(file: File): Promise<DecodedImage> {
  const url = URL.createObjectURL(file)
  const image = new Image()
  image.src = url
  try {
    await image.decode()
  } catch {
    URL.revokeObjectURL(url)
    throw new UserFacingError(UNSUPPORTED_MESSAGE)
  }
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    release: () => URL.revokeObjectURL(url),
  }
}

async function decodeImage(file: File): Promise<DecodedImage> {
  try {
    return await decodeWithBitmap(file)
  } catch {
    return decodeWithElement(file)
  }
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob && blob.type === UPLOAD_CONTENT_TYPE) resolve(blob)
        else reject(new UserFacingError(UNSUPPORTED_MESSAGE))
      },
      UPLOAD_CONTENT_TYPE,
      JPEG_QUALITY,
    )
  })
}

function scaledSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, CLIENT_MAX_EDGE_PX / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** Reads the capture date, then re-encodes the photo as an upright JPEG capped at CLIENT_MAX_EDGE_PX. */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const capturedAt = await readCaptureDate(file)
  const decoded = await decodeImage(file)
  try {
    if (decoded.width === 0 || decoded.height === 0) throw new UserFacingError(UNSUPPORTED_MESSAGE)
    const size = scaledSize(decoded.width, decoded.height)
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) throw new UserFacingError(UNSUPPORTED_MESSAGE)
    context.drawImage(decoded.source, 0, 0, size.width, size.height)
    const blob = await canvasToJpeg(canvas)
    return { blob, ...size, capturedAt, previewUrl: URL.createObjectURL(blob) }
  } finally {
    decoded.release()
  }
}
