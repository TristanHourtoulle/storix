import type { Director } from './director'
import { CENTER_Y as CY, SHARDS, shardDirection } from './geometry'
import { between, dealCards, fadePack, hidePack } from './pack-deal'
import { burstTear, hitTear, type TearStyle } from './tear-choreography'
import { BRAND_PARTICLES, CONFETTI_PARTICLES } from './tiers'

export const PACK_TAPS = 3

function wobblePack(d: Director, count: number): void {
  const { pack } = d.layers
  const tilt = count % 2 ? 1 : -1
  const frames: Keyframe[] = [
    { transform: `scale(.9) rotate(${-3 * tilt}deg)`, offset: 0.3 },
    { transform: `scale(${1 + count * 0.02}) rotate(${2 * tilt}deg)`, offset: 0.65 },
    { transform: 'scale(1) rotate(0deg)' },
  ]
  const movers = pack.tearFx ? [pack.wrap, pack.tearFx] : [pack.wrap]
  movers.forEach((el) => d.fire(d.tween(el, frames, { duration: 320, easing: 'ease-out' })))
}

function crackPack(d: Director, count: number): void {
  d.layers.pack.crackGroups[count - 1]?.querySelectorAll('path').forEach((path) => {
    d.animate(path, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
      duration: 200,
      fill: 'forwards',
      easing: 'ease-out',
    })
  })
}

/**
 * Plays one hit on the sealed pack, marked by the worn tear (or the original cracks).
 * Returns true when the pack is ready to burst.
 */
export function hitPack(d: Director, count: number, tear: TearStyle | null = null): boolean {
  const { pack } = d.layers
  d.sound({ name: 'packTap', step: count - 1 })
  pack.pipDots.forEach((pip, index) => pip.classList.toggle('is-on', index < count))
  wobblePack(d, count)
  d.shake(2 + count * 2.5, 260)
  d.flash(0.12 * count, 220)
  if (tear) {
    if (tear.kind === 'verre') crackPack(d, count)
    hitTear(d, tear, count, PACK_TAPS)
    return count >= PACK_TAPS
  }
  crackPack(d, count)
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

/** Bursts the pack, with the worn tear or into the original shards, and deals the cards into the deck. */
export async function burstPack(d: Director, tear: TearStyle | null = null): Promise<void> {
  const { pack } = d.layers
  if (d.isReduced) {
    d.sound({ name: 'burst' })
    await fadePack(d)
    hidePack(d)
    return
  }
  if (tear) {
    await burstTear(d, tear, throwShards)
    return
  }
  await d.wait(160)
  d.sound({ name: 'burst' })
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
