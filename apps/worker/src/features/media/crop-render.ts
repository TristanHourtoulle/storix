import { createHash } from 'node:crypto'
import sharp from 'sharp'
import {
  MEDIA_FORMATS,
  MEDIA_VARIANT_SIZES,
  canonicalCrop,
  cropRectToPixels,
  rotatedSize,
  type CropRect,
} from '@storix/shared/domain'
import { encodeFile, openImage, type RenderedFile } from './image-pipeline'

const CROP_ID_LENGTH = 16
const MAX_WORKING_EDGE = 3200

/** Returns the 16 hex characters identifying a crop in storage keys. */
export function cropIdOf(crop: CropRect): string {
  return createHash('sha256').update(canonicalCrop(crop)).digest('hex').slice(0, CROP_ID_LENGTH)
}

/** Renders every AVIF/WebP variant of the image through a crop of its oriented, then rotated, pixels. */
export async function renderCroppedVariants(
  buffer: Buffer,
  crop: CropRect,
): Promise<RenderedFile[]> {
  const rotated = await openImage(buffer)
    .autoOrient()
    .rotate(crop.rotate)
    .resize({
      width: MAX_WORKING_EDGE,
      height: MAX_WORKING_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .raw()
    .toBuffer({ resolveWithObject: true })
  const raw = {
    width: rotated.info.width,
    height: rotated.info.height,
    channels: rotated.info.channels,
  }
  const oriented = rotatedSize({ width: raw.width, height: raw.height }, crop.rotate)
  const extracted = await sharp(rotated.data, { raw })
    .extract(cropRectToPixels(crop, oriented))
    .raw()
    .toBuffer({ resolveWithObject: true })
  const files: RenderedFile[] = []
  for (const size of MEDIA_VARIANT_SIZES) {
    for (const format of MEDIA_FORMATS) {
      const image = sharp(extracted.data, {
        raw: {
          width: extracted.info.width,
          height: extracted.info.height,
          channels: extracted.info.channels,
        },
      })
      files.push(await encodeFile(image, size, format))
    }
  }
  return files
}
