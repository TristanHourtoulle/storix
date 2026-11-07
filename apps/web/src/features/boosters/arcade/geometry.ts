import type { Pose } from './director'

export const STAGE_HEIGHT = 572
export const CENTER_Y = 280
export const PACK_TOP = CENTER_Y - 145
export const PIPS_TOP = CENTER_Y + 160
export const STAMP_TOP = CENTER_Y + 150
export const CARD_WIDTH = 220
export const SLOT_WIDTH = 40
export const SLOT_SCALE = SLOT_WIDTH / CARD_WIDTH

const DECK_Y = 512
const DECK_SCALE = 0.34
const DECK_SPREAD = 64

export const SHARDS: readonly (readonly string[])[] = [
  ['0 0', '55% 0', '50% 41%', '0 30%'],
  ['55% 0', '100% 0', '100% 35%', '50% 41%'],
  ['100% 35%', '100% 75%', '50% 41%'],
  ['100% 75%', '100% 100%', '45% 100%', '50% 41%'],
  ['45% 100%', '0 100%', '0 70%', '50% 41%'],
  ['0 70%', '0 30%', '50% 41%'],
]

export const CRACK_PATHS: readonly (readonly string[])[] = [
  ['M100 120 L88 100 L94 86 L80 62', 'M100 120 L116 106 L112 90'],
  ['M100 120 L70 132 L58 156 L38 162', 'M100 120 L132 140 L150 136 L168 162'],
  ['M100 120 L104 152 L92 178 L98 212', 'M100 120 L60 104 L34 110', 'M100 120 L140 96 L170 92'],
]

export interface DeckPose extends Pose {
  z: number
}

/** Places the k-th of n face-down cards in the fanned deck at the bottom of the stage. */
export function deckPose(k: number, n: number): DeckPose {
  const d = k - (n - 1) / 2
  return { x: d * DECK_SPREAD, y: DECK_Y, s: DECK_SCALE, r: d * 4, z: 10 + k }
}

/** Unit direction of a shard from the crack origin, used to throw it outwards. */
export function shardDirection(poly: readonly string[]): { dx: number; dy: number } {
  const points = poly.map((point) => point.split(' ').map((value) => parseFloat(value) || 0))
  const cx = points.reduce((sum, [x = 0]) => sum + x, 0) / points.length - 50
  const cy = points.reduce((sum, [, y = 0]) => sum + y, 0) / points.length - 41
  const length = Math.hypot(cx, cy) || 1
  return { dx: cx / length, dy: cy / length }
}
