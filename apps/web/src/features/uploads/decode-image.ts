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
