import { UPLOAD_CONTENT_TYPE } from '@storix/shared'
import { UserFacingError } from '@/features/errors/user-message'

const JPEG_QUALITY = 0.9

export const UNSUPPORTED_MESSAGE = 'Format non pris en charge sur cet appareil.'

export interface DecodedImage {
  source: CanvasImageSource
  width: number
  height: number
  release: () => void
}

async function decodeWithBitmap(file: Blob): Promise<DecodedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    release: () => bitmap.close(),
  }
}

async function decodeWithElement(file: Blob): Promise<DecodedImage> {
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

/** Decodes an image upright, with `createImageBitmap` first and an `<img>` element as the fallback. */
export async function decodeImage(file: Blob): Promise<DecodedImage> {
  try {
    return await decodeWithBitmap(file)
  } catch {
    return decodeWithElement(file)
  }
}

/** Encodes the canvas as a JPEG blob; rejects with a user-facing error when the browser cannot. */
export function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
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

function scaledSize(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** Decodes upright and re-encodes as a JPEG whose longest edge is at most `maxEdge`. */
export async function encodeScaledJpeg(
  file: Blob,
  maxEdge: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const decoded = await decodeImage(file)
  const canvas = document.createElement('canvas')
  try {
    if (decoded.width === 0 || decoded.height === 0) throw new UserFacingError(UNSUPPORTED_MESSAGE)
    const size = scaledSize(decoded.width, decoded.height, maxEdge)
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) throw new UserFacingError(UNSUPPORTED_MESSAGE)
    context.drawImage(decoded.source, 0, 0, size.width, size.height)
    const blob = await canvasToJpeg(canvas)
    return { blob, ...size }
  } finally {
    canvas.width = 0
    canvas.height = 0
    decoded.release()
  }
}
