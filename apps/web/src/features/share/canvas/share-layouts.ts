import {
  boosterContextLine,
  packSubline,
  shareBadges,
  shareBanner,
  tierRank,
  type Box,
  type CardTier,
  type ShareBadge,
} from '@storix/shared'
import { formatCardNumber } from '@/features/cards/card-number'
import type { ShareCard, ShareStyle, ShareSubject } from '../share-subject'
import { drawBrand } from './draw-brand'
import { drawShareCard } from './draw-card'
import type { ShareAssets } from './share-assets'
import {
  BODY_FONT,
  DISPLAY_FONT,
  INK,
  TIER_HEX,
  fitText,
  roundRectPath,
  setLetterSpacing,
  withAlpha,
} from './primitives'

export const SHARE_WIDTH = 1080
export const SHARE_HEIGHT = 1350

const W = SHARE_WIDTH
const H = SHARE_HEIGHT
const BADGE_COLOR: Readonly<Record<ShareBadge['tone'], string>> = {
  new: '#4ade80',
  foil: '#22d3ee',
}
const PILL_HEIGHT = 50
const PILL_PADDING = 44
const PILL_GAP = 16
const PACK_ROW_WIDTH = 200
const PACK_ROW_GAP = 26

function drawBackground(ctx: CanvasRenderingContext2D, tier: CardTier): void {
  ctx.fillStyle = '#050508'
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, W * 0.8)
  glow.addColorStop(0, withAlpha(TIER_HEX[tier], 0.32))
  glow.addColorStop(1, withAlpha(TIER_HEX[tier], 0))
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)
}

function headlineFill(
  ctx: CanvasRenderingContext2D,
  tier: CardTier,
  textWidth: number,
): string | CanvasGradient {
  if (tier !== 'legendary' && tier !== 'mythic') {
    return tierRank(tier) >= tierRank('rare') ? TIER_HEX[tier] : INK
  }
  const gradient = ctx.createLinearGradient(W / 2 - textWidth / 2, 0, W / 2 + textWidth / 2, 0)
  const stops: readonly (readonly [number, string])[] =
    tier === 'legendary'
      ? [
          [0, '#fcd34d'],
          [0.5, '#fbbf24'],
          [1, '#f59e0b'],
        ]
      : [
          [0, '#f87171'],
          [0.33, '#fbbf24'],
          [0.66, '#22d3ee'],
          [1, '#c084fc'],
        ]
  stops.forEach(([offset, color]) => gradient.addColorStop(offset, color))
  return gradient
}

function drawHeadline(
  ctx: CanvasRenderingContext2D,
  text: string,
  tier: CardTier,
  y: number,
  size: number,
): void {
  ctx.save()
  ctx.font = `700 ${size}px ${DISPLAY_FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  setLetterSpacing(ctx, -1)
  const fitted = fitText(ctx, text, W - 100)
  ctx.fillStyle = headlineFill(ctx, tier, ctx.measureText(fitted).width)
  ctx.shadowColor = withAlpha(TIER_HEX[tier], 0.5)
  ctx.shadowBlur = 30
  ctx.fillText(fitted, W / 2, y)
  ctx.restore()
}

function drawSubline(ctx: CanvasRenderingContext2D, text: string, y: number): void {
  ctx.save()
  ctx.font = `500 30px ${BODY_FONT}`
  ctx.fillStyle = '#c9c9da'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(fitText(ctx, text, W - 100), W / 2, y)
  ctx.restore()
}

function drawBadges(ctx: CanvasRenderingContext2D, badges: readonly ShareBadge[], y: number): void {
  if (badges.length === 0) return
  ctx.save()
  ctx.font = `700 26px ${DISPLAY_FONT}`
  setLetterSpacing(ctx, 3)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 2
  const labels = badges.map((badge) => badge.label.toUpperCase())
  const widths = labels.map((label) => ctx.measureText(label).width + PILL_PADDING)
  const total = widths.reduce((sum, width) => sum + width, 0) + (badges.length - 1) * PILL_GAP
  badges.reduce(
    (x, badge, index) => {
      const width = widths[index] ?? 0
      const color = BADGE_COLOR[badge.tone]
      roundRectPath(ctx, x, y, width, PILL_HEIGHT, PILL_HEIGHT / 2)
      ctx.fillStyle = withAlpha(color, 0.16)
      ctx.fill()
      ctx.strokeStyle = withAlpha(color, 0.6)
      ctx.stroke()
      ctx.fillStyle = color
      ctx.fillText(labels[index] ?? '', x + width / 2, y + PILL_HEIGHT / 2 + 1)
      return x + width + PILL_GAP
    },
    (W - total) / 2,
  )
  ctx.restore()
}

function leagueLine(subject: ShareSubject): string | null {
  return subject.leagueName ? `Ligue ${subject.leagueName}` : null
}

function cardLine(subject: ShareSubject): string {
  const number = formatCardNumber(subject.card.number)
  const league = leagueLine(subject)
  return league ? `${league} · carte ${number}` : `Carte ${number}`
}

function photoOf(assets: ShareAssets, card: ShareCard): CanvasImageSource | null {
  return assets.photos.get(card.id) ?? null
}

function drawCardLayout(
  ctx: CanvasRenderingContext2D,
  subject: ShareSubject,
  assets: ShareAssets,
): Box {
  const { card } = subject
  drawBackground(ctx, card.facts.tier)
  drawShareCard(ctx, card, photoOf(assets, card), (W - 660) / 2, 110, 660)
  return drawBrand(ctx, assets.logo, W, 1200, cardLine(subject))
}

function drawFlexLayout(
  ctx: CanvasRenderingContext2D,
  subject: ShareSubject,
  assets: ShareAssets,
): Box {
  const { card, origin } = subject
  drawBackground(ctx, card.facts.tier)
  drawHeadline(ctx, shareBanner(card.facts, origin), card.facts.tier, 128, 84)
  drawSubline(ctx, origin.kind === 'booster' ? boosterContextLine(origin) : cardLine(subject), 186)
  drawShareCard(ctx, card, photoOf(assets, card), (W - 560) / 2, 236, 560)
  drawBadges(ctx, shareBadges(card.facts, origin), 1050)
  return drawBrand(ctx, assets.logo, W, 1210, leagueLine(subject))
}

function drawPackLayout(
  ctx: CanvasRenderingContext2D,
  subject: ShareSubject,
  assets: ShareAssets,
): Box {
  const pack = subject.pack && subject.pack.length > 0 ? subject.pack : [subject.card]
  const [best = subject.card, ...others] = pack
  drawBackground(ctx, best.facts.tier)
  drawHeadline(ctx, 'Mon booster', best.facts.tier, 118, 80)
  drawSubline(ctx, packSubline(pack.length, best.facts.tierLabel), 174)
  drawShareCard(ctx, best, photoOf(assets, best), (W - 400) / 2, 220, 400)
  const rowWidth = others.length * PACK_ROW_WIDTH + Math.max(0, others.length - 1) * PACK_ROW_GAP
  const rowLeft = (W - rowWidth) / 2
  others.forEach((card, index) => {
    const x = rowLeft + index * (PACK_ROW_WIDTH + PACK_ROW_GAP)
    drawShareCard(ctx, card, photoOf(assets, card), x, 830, PACK_ROW_WIDTH)
  })
  return drawBrand(ctx, assets.logo, W, 1240, leagueLine(subject))
}

/** Draws one 1080×1350 share layout (Carte, Flex or Booster entier); returns where the logo landed. */
export function drawShareLayout(
  ctx: CanvasRenderingContext2D,
  style: ShareStyle,
  subject: ShareSubject,
  assets: ShareAssets,
): Box {
  if (style === 'card') return drawCardLayout(ctx, subject, assets)
  if (style === 'flex') return drawFlexLayout(ctx, subject, assets)
  return drawPackLayout(ctx, subject, assets)
}
