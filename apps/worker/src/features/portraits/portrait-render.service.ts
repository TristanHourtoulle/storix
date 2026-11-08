import { PORTRAIT_SIZES, type PortraitSize } from '@storix/shared/domain'
import { openImage } from '../media/image-pipeline'

const PORTRAIT_WEBP_QUALITY = 80

export interface RenderedPortraitFile {
  size: PortraitSize
  body: Buffer
  contentType: 'image/webp'
}

export interface RenderedPortrait {
  dominantColor: string
  files: RenderedPortraitFile[]
}

function toHex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, '0')
}

async function renderSize(buffer: Buffer, size: PortraitSize): Promise<RenderedPortraitFile> {
  const body = await openImage(buffer)
    .autoOrient()
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .webp({ quality: PORTRAIT_WEBP_QUALITY })
    .toBuffer()
  return { size, body, contentType: 'image/webp' }
}

/** Renders the upright square WebP sizes of a portrait and its dominant color, without metadata. */
export async function renderPortrait(buffer: Buffer): Promise<RenderedPortrait> {
  const files = await Promise.all(PORTRAIT_SIZES.map((size) => renderSize(buffer, size)))
  const { dominant } = await openImage(buffer).stats()
  return {
    dominantColor: `#${toHex(dominant.r)}${toHex(dominant.g)}${toHex(dominant.b)}`,
    files,
  }
}
