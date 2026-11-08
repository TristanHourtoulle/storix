import { PORTRAIT_SOURCE_MAX_PX, portraitCropPixels, type CropRect } from '@storix/shared/domain'
import { UserFacingError } from '@/features/errors/user-message'
import { UNSUPPORTED_MESSAGE, canvasToJpeg, decodeImage } from '@/features/uploads/decode-image'
import type { PreparedPhoto } from '@/features/uploads/prepare-photo'

/** Draws the cropped square of a prepared photo, capped at PORTRAIT_SOURCE_MAX_PX, and encodes it as a JPEG. */
export async function cropToSquareJpeg(photo: PreparedPhoto, crop: CropRect | null): Promise<Blob> {
  const decoded = await decodeImage(photo.blob)
  const canvas = document.createElement('canvas')
  try {
    const pixels = portraitCropPixels(crop, { width: photo.width, height: photo.height })
    const edge = Math.min(pixels.size, PORTRAIT_SOURCE_MAX_PX)
    canvas.width = edge
    canvas.height = edge
    const context = canvas.getContext('2d')
    if (!context) throw new UserFacingError(UNSUPPORTED_MESSAGE)
    context.drawImage(
      decoded.source,
      pixels.left,
      pixels.top,
      pixels.size,
      pixels.size,
      0,
      0,
      edge,
      edge,
    )
    return await canvasToJpeg(canvas)
  } finally {
    canvas.width = 0
    canvas.height = 0
    decoded.release()
  }
}
