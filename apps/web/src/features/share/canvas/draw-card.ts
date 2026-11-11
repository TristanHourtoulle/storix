import { tierRank } from '@storix/shared'
import type { ShareCard } from '../share-subject'
import type { GradientStops, RarityPalette } from '@/features/cosmetics/rarity-palettes'
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

interface CardRect {
  x: number
  y: number
  w: number
  h: number
  radius: number
}

const FRAME_GAP = '#0a0a10'

function strokeRect(
  ctx: CanvasRenderingContext2D,
  rect: CardRect,
  inset: number,
  lineWidth: number,
  style: string | CanvasGradient,
): void {
  roundRectPath(
    ctx,
    rect.x + inset,
    rect.y + inset,
    rect.w - inset * 2,
    rect.h - inset * 2,
    Math.max(0, rect.radius - inset),
  )
  ctx.lineWidth = lineWidth
  ctx.strokeStyle = style
  ctx.stroke()
}

function gemGradient(
  ctx: CanvasRenderingContext2D,
  card: ShareCard,
  palette: RarityPalette,
  rect: CardRect,
): string | CanvasGradient {
  const { ring, deep } = palette.tiers[card.facts.tier]
  if (typeof ctx.createConicGradient !== 'function') return ring
  const gradient = ctx.createConicGradient(Math.PI / 6, rect.x + rect.w / 2, rect.y + rect.h / 2)
  const stops: GradientStops =
    card.facts.tier === 'mythic'
      ? palette.mythicRainbow.map((color, index, all) => [index / (all.length - 1), color] as const)
      : [
          [0, ring],
          [0.08, 'rgba(255, 255, 255, 0.8)'],
          [0.2, deep],
          [0.34, ring],
          [0.44, 'rgba(255, 255, 255, 0.67)'],
          [0.58, deep],
          [0.72, ring],
          [0.82, 'rgba(255, 255, 255, 0.8)'],
          [0.92, deep],
          [1, ring],
        ]
  stops.forEach(([offset, color]) => gradient.addColorStop(offset, color))
  return gradient
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  card: ShareCard,
  palette: RarityPalette,
  rect: CardRect,
): void {
  const unit = Math.max(2, rect.w * 0.012)
  const ring = palette.tiers[card.facts.tier].ring
  const ringStyle = strokeStyle(ctx, card, palette, rect.x, rect.y, rect.w, rect.h)
  ctx.save()
  switch (palette.frame) {
    case 'ring':
      strokeRect(ctx, rect, 0, unit, ringStyle)
      break
    case 'neon':
      ctx.shadowColor = ring
      ctx.shadowBlur = rect.w * 0.05
      strokeRect(ctx, rect, 0, unit * 0.75, ringStyle)
      strokeRect(ctx, rect, unit * 2, unit * 0.5, ring)
      break
    case 'gem':
      ctx.shadowColor = withAlpha(ring, 0.35)
      ctx.shadowBlur = rect.w * 0.05
      strokeRect(ctx, rect, unit, unit * 2, gemGradient(ctx, card, palette, rect))
      break
    case 'filet':
      strokeRect(ctx, rect, unit * 0.5, unit * 0.5, ringStyle)
      strokeRect(ctx, rect, -unit * 1.5, unit * 1.5, FRAME_GAP)
      strokeRect(ctx, rect, -unit * 2.5, unit * 0.5, withAlpha(ring, 0.7))
      break
  }
  ctx.restore()
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

  drawFrame(ctx, card, palette, { x, y, w: width, h, radius })

  return h
}
