import type { Box } from '@storix/shared'
import { DEFAULT_RARITY_PALETTE, type RarityPalette } from '@/features/cosmetics/rarity-palettes'
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
  palette: RarityPalette = DEFAULT_RARITY_PALETTE,
): Promise<RenderedShareImage> {
  const [, assets] = await Promise.all([ensureShareFonts(subject), loadShareAssets(subject, style)])
  const canvas = document.createElement('canvas')
  canvas.width = SHARE_WIDTH
  canvas.height = SHARE_HEIGHT
  try {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D is not available')
    const logoBox = drawShareLayout(ctx, style, subject, assets, palette)
    return { blob: await canvasToPng(canvas), logoBox }
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}
