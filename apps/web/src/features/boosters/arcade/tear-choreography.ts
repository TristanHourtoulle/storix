import type { TearKind } from '@/features/cosmetics/cosmetic-skins'
import type { Director } from './director'
import { CENTER_Y as CY, PACK_TOP } from './geometry'
import { between, dealCards, hidePack } from './pack-deal'

export interface TearStyle {
  kind: TearKind
  accent: string
}

const PACK_WIDTH = 200
const TEAR_Y = PACK_TOP + 70
const EMBERS = ['#fde047', '#fbbf24', '#fb923c', '#f97316', '#dc2626'] as const
const ASH = ['#57534e', '#292524', '#78716c'] as const
const GLASS = ['#ffffff', '#e0f2fe', '#a5f3fc'] as const
const GOLD = ['#fff7d6', '#fde68a', '#e8cf8a', '#d9b45a'] as const
const GIFT_CONFETTI = ['#fde68a', '#d9b45a', '#fff7d6', '#a78bfa', '#22d3ee', '#f472b6'] as const
const UPWARD: readonly [number, number] = [-Math.PI * 0.9, -Math.PI * 0.1]

function part(d: Director, selector: string): HTMLElement | null {
  return d.layers.pack.tearFx?.querySelector<HTMLElement>(selector) ?? null
}

function packLeft(d: Director): number {
  return d.width / 2 - PACK_WIDTH / 2
}

function hitBraises(d: Director, count: number, taps: number): void {
  const burn = part(d, '.ar-tear-burn')
  const reach = count / taps
  if (burn) {
    d.fire(
      d.tween(
        burn,
        { transform: `scaleX(${reach})`, opacity: 1 },
        { duration: 260, easing: 'ease-out' },
      ),
    )
  }
  d.burst(packLeft(d) + PACK_WIDTH * reach, TEAR_Y, {
    n: 12 * count,
    kind: 'spark',
    colors: EMBERS,
    angle: UPWARD,
    speed: [60, 220],
    gravity: -120,
    drag: 1.4,
    life: [0.5, 1.1],
    size: [1, 2.2],
    jx: 8,
  })
}

function hitVerre(d: Director, count: number, accent: string): void {
  d.burst(d.width / 2, CY - 25, {
    n: 8 * count,
    kind: 'spark',
    colors: [...GLASS, accent],
    speed: [120, 300],
    gravity: 420,
    life: [0.3, 0.6],
    size: [1, 2],
  })
}

function hitRuban(d: Director, count: number): void {
  const bow = part(d, '.ar-tear-bow')
  const ribbon = part(d, '.ar-tear-ribbon.is-h')
  if (bow) {
    d.fire(
      d.tween(
        bow,
        [
          { transform: `translateX(-50%) rotate(${-14 - count * 4}deg) scale(1.08)`, offset: 0.4 },
          { transform: `translateX(-50%) rotate(${count * 5}deg) scale(${1 - count * 0.06})` },
        ],
        { duration: 360, easing: 'ease-out' },
      ),
    )
  }
  if (ribbon) {
    d.fire(
      d.tween(
        ribbon,
        { transform: `translateY(${count * 3}px) rotate(${-count * 2.5}deg)` },
        { duration: 300, easing: 'ease-out' },
      ),
    )
  }
  d.burst(d.width / 2, TEAR_Y + 40, {
    n: 8 * count,
    kind: 'spark',
    colors: GOLD,
    speed: [100, 260],
    gravity: 380,
    life: [0.3, 0.6],
    size: [1, 2],
  })
}

/** Marks one hit on the sealed pack with the worn tear. */
export function hitTear(d: Director, tear: TearStyle, count: number, taps: number): void {
  switch (tear.kind) {
    case 'braises':
      hitBraises(d, count, taps)
      break
    case 'verre':
      hitVerre(d, count, tear.accent)
      break
    case 'ruban':
      hitRuban(d, count)
      break
  }
}

function fadeSealedExtras(d: Director): void {
  const { pack } = d.layers
  d.fire(d.tween(pack.pips, { opacity: 0 }, { duration: 200 }))
  d.fire(d.tween(pack.halo, { opacity: 0 }, { duration: 400 }))
}

function openTop(d: Director, frames: Keyframe[], options: KeyframeAnimationOptions): void {
  const { pack } = d.layers
  pack.wrap.classList.add('is-torn')
  if (pack.tearTop) {
    pack.tearTop.style.opacity = '1'
    d.fire(d.tween(pack.tearTop, frames, options))
  }
}

function dropBody(d: Director, delay: number): void {
  d.fire(
    d.tween(
      d.layers.pack.wrap,
      { transform: 'translateY(36px) scale(.94)', opacity: 0 },
      { duration: 560, delay, easing: 'ease-in' },
    ),
  )
}

async function finish(d: Director, rays: string): Promise<void> {
  d.rays(rays, 0.45, 150)
  dealCards(d)
  await d.wait(500)
  d.rays(null, 0, 700)
  await d.wait(700)
  hidePack(d)
}

async function burstBraises(d: Director): Promise<void> {
  const burn = part(d, '.ar-tear-burn')
  await d.wait(120)
  d.sound({ name: 'burst' })
  d.flash(0.55, 520)
  d.shake(8, 480)
  fadeSealedExtras(d)
  if (burn) d.fire(d.tween(burn, { opacity: 0 }, { duration: 500, delay: 200 }))
  openTop(
    d,
    [
      { transform: 'translate(0, 0) rotate(0deg)', filter: 'brightness(.6) sepia(.5)' },
      {
        transform: `translate(${between(-30, -10)}px, 300px) rotate(-26deg)`,
        filter: 'brightness(.25) sepia(.8)',
        opacity: 0,
      },
    ],
    { duration: 950, easing: 'cubic-bezier(.5,0,.9,.6)' },
  )
  d.burst(d.width / 2, TEAR_Y, {
    n: 110,
    kind: 'spark',
    colors: EMBERS,
    angle: UPWARD,
    speed: [80, 340],
    gravity: -140,
    drag: 1.2,
    life: [0.8, 1.6],
    size: [1.2, 2.8],
    jx: PACK_WIDTH / 2,
  })
  d.burst(d.width / 2, TEAR_Y, {
    n: 30,
    kind: 'dot',
    colors: ASH,
    speed: [40, 160],
    gravity: 260,
    life: [0.8, 1.4],
    size: [1.2, 2.4],
    jx: PACK_WIDTH / 2,
  })
  dropBody(d, 160)
  await finish(d, '#fb923c')
}

async function burstVerre(
  d: Director,
  accent: string,
  throwShards: (d: Director) => void,
): Promise<void> {
  const { pack } = d.layers
  await d.wait(140)
  d.sound({ name: 'burst' })
  d.flash(1, 520)
  d.shake(10, 520)
  pack.wrap.style.visibility = 'hidden'
  fadeSealedExtras(d)
  pack.shards.forEach((shard) => {
    shard.classList.add('is-glass')
    shard.style.setProperty('--tear-c', accent)
  })
  throwShards(d)
  const x = d.width / 2
  d.burst(x, CY - 26, {
    n: 120,
    kind: 'confetti',
    colors: [...GLASS, accent, accent],
    speed: [220, 620],
    gravity: 900,
    drag: 1.3,
    life: [0.8, 1.4],
    size: [2, 4],
  })
  d.burst(x, CY - 26, {
    n: 50,
    kind: 'spark',
    colors: [accent, '#ffffff'],
    speed: [300, 700],
    gravity: 200,
    life: [0.3, 0.7],
    size: [1.2, 2.4],
  })
  await finish(d, accent)
}

async function burstRuban(d: Director): Promise<void> {
  const bow = part(d, '.ar-tear-bow')
  const ribbons = [part(d, '.ar-tear-ribbon.is-h'), part(d, '.ar-tear-ribbon.is-v')]
  d.sound({ name: 'burst' })
  fadeSealedExtras(d)
  if (bow) {
    d.fire(
      d.tween(
        bow,
        { transform: 'translate(-50%, -170px) rotate(260deg) scale(.6)', opacity: 0 },
        { duration: 720, easing: 'cubic-bezier(.2,.7,.4,1)' },
      ),
    )
  }
  ribbons.forEach((ribbon, index) => {
    if (!ribbon) return
    const side = index === 0 ? -1 : 1
    d.fire(
      d.tween(
        ribbon,
        {
          transform: `translate(${side * 28}px, 260px) rotate(${side * 22}deg)`,
          opacity: 0,
        },
        { duration: 900, delay: index * 80, easing: 'cubic-bezier(.5,0,.9,.6)' },
      ),
    )
  })
  await d.wait(260)
  d.flash(0.6, 480)
  d.shake(7, 420)
  openTop(
    d,
    [
      { transform: 'translate(0, 0) rotate(0deg)' },
      { transform: 'translate(-24px, -110px) rotate(-18deg)', opacity: 0 },
    ],
    { duration: 760, easing: 'cubic-bezier(.2,.7,.4,1)' },
  )
  d.burst(d.width / 2, TEAR_Y, {
    n: 120,
    kind: 'confetti',
    colors: GIFT_CONFETTI,
    speed: [200, 560],
    gravity: 900,
    drag: 1.3,
    life: [0.9, 1.6],
    size: [3, 5.5],
  })
  dropBody(d, 120)
  await finish(d, '#e8cf8a')
}

/** Opens the pack with the worn tear, then deals the cards into the deck. */
export async function burstTear(
  d: Director,
  tear: TearStyle,
  throwShards: (d: Director) => void,
): Promise<void> {
  switch (tear.kind) {
    case 'braises':
      return burstBraises(d)
    case 'verre':
      return burstVerre(d, tear.accent, throwShards)
    case 'ruban':
      return burstRuban(d)
  }
}
