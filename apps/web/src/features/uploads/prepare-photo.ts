import { CLIENT_MAX_EDGE_PX, resolveCaptureDate } from '@storix/shared'
import { parse } from 'exifr/dist/lite.esm.mjs'
import { logger } from '@/lib/logger'
import { encodeScaledJpeg } from './decode-image'

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

/** Reads the capture date, then re-encodes the photo as an upright JPEG capped at CLIENT_MAX_EDGE_PX. */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const capturedAt = await readCaptureDate(file)
  const { blob, width, height } = await encodeScaledJpeg(file, CLIENT_MAX_EDGE_PX)
  return { blob, width, height, capturedAt, previewUrl: URL.createObjectURL(blob) }
}
