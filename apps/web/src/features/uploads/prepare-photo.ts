import { CLIENT_MAX_EDGE_PX, resolveCaptureDate } from '@storix/shared'
import { parse } from 'exifr/dist/lite.esm.mjs'
import { UserFacingError } from '@/features/errors/user-message'
import { logger } from '@/lib/logger'
import { UNSUPPORTED_MESSAGE, canvasToJpeg, decodeImage } from './decode-image'

export interface PreparedPhoto {
  blob: Blob
  width: number
  height: number
  capturedAt: string | null
  previewUrl: string
}

const EXIF_DATE_OPTIONS = {
  ifd1: false,
  gps: false,
  interop: false,
  xmp: false,
  icc: false,
  iptc: false,
  jfif: false,
  exif: { pick: ['DateTimeOriginal', 'OffsetTimeOriginal', 'CreateDate'] },
}

async function readCaptureDate(file: File): Promise<string | null> {
  try {
    const tags: unknown = await parse(file, EXIF_DATE_OPTIONS)
    return resolveCaptureDate(tags, new Date())
  } catch (error) {
    logger.warn('Capture date could not be read', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
    })
    return null
  }
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
  const canvas = document.createElement('canvas')
  try {
    if (decoded.width === 0 || decoded.height === 0) throw new UserFacingError(UNSUPPORTED_MESSAGE)
    const size = scaledSize(decoded.width, decoded.height)
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) throw new UserFacingError(UNSUPPORTED_MESSAGE)
    context.drawImage(decoded.source, 0, 0, size.width, size.height)
    const blob = await canvasToJpeg(canvas)
    return { blob, ...size, capturedAt, previewUrl: URL.createObjectURL(blob) }
  } finally {
    canvas.width = 0
    canvas.height = 0
    decoded.release()
  }
}
