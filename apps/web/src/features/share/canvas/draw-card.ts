import { tierRank } from '@storix/shared'
import type { ShareCard } from '../share-subject'
import type { RarityPalette } from '@/features/cosmetics/rarity-palettes'
import { DISPLAY_FONT, INK, fitText, roundRectPath, withAlpha } from './primitives'

const CARD_RATIO = 88 / 63
const DARK_ART = '#1e1e2a'

function intrinsicSize(image: CanvasImageSource): { width: number; height: number } {
  if (image instanceof HTMLImageElement)
    return { width: image.naturalWidth, height: image.naturalHeight }
  if (image instanceof SVGImageElement)
    return { width: image.width.baseVal.value, height: image.height.baseVal.value }
  if (image instanceof HTMLVideoElement)
    return { width: image.videoWidth, height: image.videoHeight }
  if ('displayWidth' in image) return { width: image.displayWidth, height: image.displayHeight }
  return { width: image.width, height: image.height }
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const { width, height } = intrinsicSize(image)
  if (width <= 0 || height <= 0) return
  const scale = Math.max(w / width, h / height)
  const drawWidth = width * scale
  const drawHeight = height * scale
  ctx.drawImage(image, x + (w - drawWidth) / 2, y + (h - drawHeight) / 2, drawWidth, drawHeight)
}

function strokeStyle(
  ctx: CanvasRenderingContext2D,
  card: ShareCard,
  palette: RarityPalette,
  x: number,
  y: number,
  w: number,
  h: number,
): string | CanvasGradient {
  if (card.facts.tier !== 'mythic' || typeof ctx.createConicGradient !== 'function') {
    return palette.tiers[card.facts.tier].ring
  }
  const rainbow = palette.mythicRainbow
  const gradient = ctx.createConicGradient(0, x + w / 2, y + h / 2)
  rainbow.forEach((color, index) => gradient.addColorStop(index / (rainbow.length - 1), color))
  return gradient
}

function drawSheen(
  ctx: CanvasRenderingContext2D,
  card: ShareCard,
  palette: RarityPalette,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const { tier, isFoil } = card.facts
  if (tierRank(tier) < tierRank('epic') && !isFoil) return
  const sheen = ctx.createLinearGradient(x, y, x + w, y + h)
  sheen.addColorStop(0.2, 'rgba(255, 255, 255, 0)')
  sheen.addColorStop(0.36, 'rgba(255, 255, 255, 0.28)')
  sheen.addColorStop(
    0.46,
    isFoil ? 'rgba(34, 211, 238, 0.22)' : withAlpha(palette.tiers[tier].ring, 0.3),
  )
  sheen.addColorStop(0.56, 'rgba(192, 132, 252, 0.2)')
  sheen.addColorStop(0.7, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = sheen
  ctx.fillRect(x, y, w, h)
}

/** Draws a 63:88 Storix card with its photo, band, tier line and tier stroke; returns its height. */
export function drawShareCard(
  ctx: CanvasRenderingContext2D,
  card: ShareCard,
  photo: CanvasImageSource | null,
  x: number,
  y: number,
  width: number,
  palette: RarityPalette,
): number {
  const h = width * CARD_RATIO
  const radius = width * 0.06
  const tierHex = palette.tiers[card.facts.tier].ring

  ctx.save()
  ctx.shadowColor = withAlpha(tierHex, 0.55)
  ctx.shadowBlur = width * 0.2
  roundRectPath(ctx, x, y, width, h, radius)
  ctx.fillStyle = DARK_ART
  ctx.fill()
  ctx.restore()

  ctx.save()
  roundRectPath(ctx, x, y, width, h, radius)
  ctx.clip()
  ctx.fillStyle = DARK_ART
  ctx.fillRect(x, y, width, h)
  if (photo) drawCover(ctx, photo, x, y, width, h)
  drawSheen(ctx, card, palette, x, y, width, h)

  const band = h * 0.17
  ctx.fillStyle = 'rgba(10, 10, 16, 0.82)'
  ctx.fillRect(x, y + h - band, width, band)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = INK
  ctx.font = `600 ${Math.round(width * 0.072)}px ${DISPLAY_FONT}`
  ctx.fillText(fitText(ctx, card.facts.title, width * 0.86), x + width * 0.07, y + h - band * 0.5)
  ctx.fillStyle = tierHex
  ctx.font = `600 ${Math.round(width * 0.046)}px ${DISPLAY_FONT}`
  const tierLine = `${card.facts.tierLabel.toUpperCase()}${card.facts.isFoil ? ' · FOIL' : ''}`
  ctx.fillText(fitText(ctx, tierLine, width * 0.86), x + width * 0.07, y + h - band * 0.18)

  ctx.beginPath()
  ctx.arc(x + width * 0.9, y + width * 0.1, width * 0.025, 0, Math.PI * 2)
  ctx.fillStyle = tierHex
  ctx.shadowColor = tierHex
  ctx.shadowBlur = width * 0.04
  ctx.fill()
  ctx.restore()

  ctx.save()
  roundRectPath(ctx, x, y, width, h, radius)
  ctx.lineWidth = Math.max(2, width * 0.012)
  ctx.strokeStyle = strokeStyle(ctx, card, palette, x, y, width, h)
  ctx.stroke()
  ctx.restore()

  return h
}
