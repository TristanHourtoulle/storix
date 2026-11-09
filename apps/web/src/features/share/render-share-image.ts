import type { Box } from '@storix/shared'
import { ensureShareFonts, loadShareAssets } from './canvas/share-assets'
import { SHARE_HEIGHT, SHARE_WIDTH, drawShareLayout } from './canvas/share-layouts'
import type { ShareStyle, ShareSubject } from './share-subject'

export interface RenderedShareImage {
  blob: Blob
  logoBox: Box
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('The share canvas could not be encoded'))
    }, 'image/png')
  })
}

/** Renders a share image to a 1080×1350 PNG once its fonts, logo and photos are ready. */
export async function renderShareImage(
  style: ShareStyle,
  subject: ShareSubject,
): Promise<RenderedShareImage> {
  const [, assets] = await Promise.all([ensureShareFonts(), loadShareAssets(subject, style)])
  const canvas = document.createElement('canvas')
  canvas.width = SHARE_WIDTH
  canvas.height = SHARE_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is not available')
  const logoBox = drawShareLayout(ctx, style, subject, assets)
  return { blob: await canvasToPng(canvas), logoBox }
}
