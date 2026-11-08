import { toTransform as T, type Director } from './director'
import { CENTER_Y as CY, SHARDS, deckPose, shardDirection } from './geometry'
import { playSound } from '@/features/sound/sound'
import { BRAND_PARTICLES, CONFETTI_PARTICLES } from './tiers'

export const PACK_TAPS = 3

const DEAL_DELAY_MS = 120
const DEAL_STAGGER_MS = 60
const DEAL_DURATION_MS = 820
const DEAL_LANDING_MS = 450
const FADE_DEAL_MS = 160

function between(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** Plays one hit on the sealed pack. Returns true when the pack is ready to burst. */
export function hitPack(d: Director, count: number): boolean {
  const { pack } = d.layers
  playSound({ name: 'packTap', step: count - 1 })
  pack.pipDots.forEach((pip, index) => pip.classList.toggle('is-on', index < count))
  pack.crackGroups[count - 1]?.querySelectorAll('path').forEach((path) => {
    d.animate(path, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
      duration: 200,
      fill: 'forwards',
      easing: 'ease-out',
    })
  })
  const tilt = count % 2 ? 1 : -1
  d.fire(
    d.tween(
      pack.wrap,
      [
        { transform: `scale(.9) rotate(${-3 * tilt}deg)`, offset: 0.3 },
        { transform: `scale(${1 + count * 0.02}) rotate(${2 * tilt}deg)`, offset: 0.65 },
        { transform: 'scale(1) rotate(0deg)' },
      ],
      { duration: 320, easing: 'ease-out' },
    ),
  )
  d.shake(2 + count * 2.5, 260)
  d.flash(0.12 * count, 220)
  d.burst(d.width / 2, CY - 25, {
    n: 10 * count,
    kind: 'spark',
    colors: BRAND_PARTICLES,
    speed: [140, 340],
    gravity: 500,
    life: [0.3, 0.6],
    size: [1, 2.2],
  })
  return count >= PACK_TAPS
}

function hidePack(d: Director): void {
  const { pack } = d.layers
  const parts = [pack.halo, pack.wrap, pack.pips, ...pack.shards]
  parts.forEach((el) => {
    el.style.display = 'none'
  })
}

async function fadePack(d: Director): Promise<void> {
  const { pack, cards } = d.layers
  const sealed = [pack.halo, pack.wrap, pack.pips]
  sealed.forEach((el) => d.fire(d.tween(el, { opacity: 0 }, { duration: 240 })))
  await d.wait(FADE_DEAL_MS)
  cards.forEach(({ root }, index) => {
    playSound({ name: 'slam', index }, (index * DEAL_STAGGER_MS) / 1000)
    const pose = deckPose(index, cards.length)
    root.style.transform = T(pose)
    root.style.zIndex = String(pose.z)
    d.fire(d.tween(root, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 }))
  })
  await d.wait(320)
}

function throwShards(d: Director): void {
  d.layers.pack.shards.forEach((shard, index) => {
    const { dx, dy } = shardDirection(SHARDS[index] ?? [])
    const distance = between(260, 380)
    shard.style.opacity = '1'
    d.fire(
      d.tween(
        shard,
        {
          transform: `translate(${dx * distance}px, ${dy * distance + 80}px) rotate(${between(-120, 120)}deg) scale(.8)`,
          opacity: 0,
        },
        { duration: 820, easing: 'cubic-bezier(.12,.7,.3,1)' },
      ),
    )
  })
}

function dealCards(d: Director): void {
  const { cards } = d.layers
  cards.forEach(({ root }, index) => {
    const pose = deckPose(index, cards.length)
    const mid = T({
      x: (pose.x ?? 0) * 0.6,
      y: CY - 150 + Math.abs(pose.x ?? 0) * 0.3,
      s: 0.5,
      r: between(-40, 40),
    })
    root.style.transform = T({ y: CY, s: 0.2 })
    root.style.opacity = '1'
    root.style.zIndex = String(pose.z)
    const delay = DEAL_DELAY_MS + index * DEAL_STAGGER_MS
    playSound({ name: 'slam', index }, (delay + DEAL_LANDING_MS) / 1000)
    d.fire(
      d.tween(root, [{ transform: mid, offset: 0.45 }, { transform: T(pose) }], {
        duration: DEAL_DURATION_MS,
        delay,
        easing: 'cubic-bezier(.2,.8,.3,1)',
      }),
    )
  })
}

/** Bursts the pack into shards and deals the cards into the deck. */
export async function burstPack(d: Director): Promise<void> {
  const { pack } = d.layers
  if (d.isReduced) {
    playSound({ name: 'burst' })
    await fadePack(d)
    hidePack(d)
    return
  }
  await d.wait(160)
  playSound({ name: 'burst' })
  d.flash(0.9, 560)
  d.shake(11, 560)
  pack.wrap.style.visibility = 'hidden'
  d.fire(d.tween(pack.pips, { opacity: 0 }, { duration: 200 }))
  d.fire(d.tween(pack.halo, { opacity: 0 }, { duration: 400 }))
  throwShards(d)
  const x = d.width / 2
  d.burst(x, CY - 26, {
    n: 140,
    kind: 'confetti',
    colors: CONFETTI_PARTICLES,
    speed: [220, 640],
    gravity: 900,
    drag: 1.3,
    life: [0.9, 1.6],
    size: [3, 5.5],
  })
  d.burst(x, CY - 26, {
    n: 50,
    kind: 'spark',
    colors: BRAND_PARTICLES,
    speed: [300, 700],
    gravity: 200,
    life: [0.3, 0.7],
    size: [1.2, 2.4],
  })
  d.rays('#a78bfa', 0.5, 150)
  dealCards(d)
  await d.wait(500)
  d.rays(null, 0, 700)
  await d.wait(700)
  hidePack(d)
}
