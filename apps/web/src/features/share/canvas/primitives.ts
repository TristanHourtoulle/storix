import type { CardTier } from '@storix/shared'

export const DISPLAY_FONT = '"Space Grotesk Variable", "Space Grotesk", sans-serif'
export const BODY_FONT = '"Inter Variable", Inter, system-ui, sans-serif'
export const INK = '#f2f2f7'

export const TIER_HEX: Readonly<Record<CardTier, string>> = {
  common: '#a1a1aa',
  uncommon: '#4ade80',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#fbbf24',
  mythic: '#c084fc',
}

export const RAINBOW: readonly string[] = [
  '#f87171',
  '#fbbf24',
  '#4ade80',
  '#22d3ee',
  '#60a5fa',
  '#c084fc',
  '#f87171',
]

/** Traces a rounded rectangle as the current path. */
export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Shortens a text with an ellipsis until it fits the width in the current font. */
export function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let cut = text
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1)
  return `${cut.trimEnd()}…`
}

/** Turns a `#rrggbb` colour into an `rgba()` string. */
export function withAlpha(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}

/** Sets the canvas letter spacing; a no-op on engines without it. */
export function setLetterSpacing(ctx: CanvasRenderingContext2D, px: number): void {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`
}
