import type { Box } from '@storix/shared'
import { BODY_FONT, DISPLAY_FONT, INK, roundRectPath, setLetterSpacing } from './primitives'

const LOGO_SIZE = 72
const LOGO_RADIUS = 18
const GAP = 18
const WORDMARK = 'Storix'
const SUB_OFFSET = 62

/** Draws the real Storix logo and wordmark centred on the canvas, with an optional sub line; returns the logo box. */
export function drawBrand(
  ctx: CanvasRenderingContext2D,
  logo: CanvasImageSource,
  canvasWidth: number,
  centerY: number,
  sub: string | null,
): Box {
  ctx.save()
  ctx.font = `700 52px ${DISPLAY_FONT}`
  setLetterSpacing(ctx, -1.56)
  const wordWidth = ctx.measureText(WORDMARK).width
  const left = Math.round((canvasWidth - (LOGO_SIZE + GAP + wordWidth)) / 2)
  const top = Math.round(centerY - LOGO_SIZE / 2)

  ctx.save()
  roundRectPath(ctx, left, top, LOGO_SIZE, LOGO_SIZE, LOGO_RADIUS)
  ctx.clip()
  ctx.drawImage(logo, left, top, LOGO_SIZE, LOGO_SIZE)
  ctx.restore()

  ctx.fillStyle = INK
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(WORDMARK, left + LOGO_SIZE + GAP, centerY)
  ctx.restore()

  if (sub) {
    ctx.save()
    ctx.font = `500 26px ${BODY_FONT}`
    ctx.fillStyle = '#9a9ab0'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(sub, canvasWidth / 2, centerY + SUB_OFFSET)
    ctx.restore()
  }

  return { left, top, width: LOGO_SIZE, height: LOGO_SIZE }
}
