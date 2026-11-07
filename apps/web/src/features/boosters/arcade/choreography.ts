import { toTransform as T, type Director } from './director'
import { CENTER_Y as CY, SHARDS, SLOT_SCALE, deckPose, shardDirection } from './geometry'
import { BRAND_PARTICLES, CONFETTI_PARTICLES, type TierFx } from './tiers'

export const PACK_TAPS = 3

function between(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function cardAt(d: Director, index: number) {
  const card = d.layers.cards[index]
  if (!card) throw new Error(`Arcade card missing: ${index}`)
  return card
}

/** Re-fans the cards still in the deck, from `from` to the last one. */
export function layoutDeck(d: Director, from: number, isDimmed: boolean, duration: number): void {
  const rest = d.layers.cards.slice(from)
  rest.forEach(({ root }, k) => {
    const pose = deckPose(k, rest.length)
    root.style.zIndex = String(pose.z)
    const frame = { transform: T(pose), filter: `brightness(${isDimmed ? 0.6 : 1})` }
    if (d.isReduced) {
      root.style.transform = frame.transform
      root.style.filter = frame.filter
      return
    }
    d.fire(d.tween(root, frame, { duration, easing: 'cubic-bezier(.2,.8,.2,1)' }))
  })
}

/** Plays one hit on the sealed pack. Returns true when the pack is ready to burst. */
export function hitPack(d: Director, count: number): boolean {
  const { pack } = d.layers
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

/** Bursts the pack into shards and deals the cards into the deck. */
export async function burstPack(d: Director): Promise<void> {
  const { pack, cards } = d.layers
  if (d.isReduced) {
    ;[pack.halo, pack.wrap, pack.pips].forEach((el) =>
      d.fire(d.tween(el, { opacity: 0 }, { duration: 240 })),
    )
    await d.wait(160)
    cards.forEach(({ root }, index) => {
      const pose = deckPose(index, cards.length)
      root.style.transform = T(pose)
      root.style.zIndex = String(pose.z)
      d.fire(d.tween(root, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 }))
    })
    await d.wait(320)
    return
  }
  await d.wait(160)
  d.flash(0.9, 560)
  d.shake(11, 560)
  pack.wrap.style.visibility = 'hidden'
  d.fire(d.tween(pack.pips, { opacity: 0 }, { duration: 200 }))
  d.fire(d.tween(pack.halo, { opacity: 0 }, { duration: 400 }))
  pack.shards.forEach((shard, index) => {
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
    d.fire(
      d.tween(root, [{ transform: mid, offset: 0.45 }, { transform: T(pose) }], {
        duration: 820,
        delay: 120 + index * 60,
        easing: 'cubic-bezier(.2,.8,.3,1)',
      }),
    )
  })
  await d.wait(500)
  d.rays(null, 0, 700)
  await d.wait(700)
}

function showStamp(d: Director, tier: TierFx, name: string): void {
  const { stamp } = d.layers
  stamp.dataset.t = tier.key
  stamp.classList.toggle('is-small', tier.level < 3)
  stamp.textContent = tier.level >= 3 ? `${name} !` : name
  d.fire(
    d.tween(
      stamp,
      [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(2.4) rotate(-16deg)' },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1) rotate(-8deg)' },
      ],
      { duration: d.isReduced ? 1 : 320, easing: 'cubic-bezier(.3,1.6,.5,1)' },
    ),
  )
}

async function present(d: Director, index: number): Promise<void> {
  const { root } = cardAt(d, index)
  root.style.zIndex = '22'
  layoutDeck(d, index + 1, true, 350)
  if (d.isReduced) {
    await d.tween(root, { opacity: 0 }, { duration: 120 })
    root.style.transform = T({ y: CY })
    root.style.filter = 'none'
    await d.tween(root, { opacity: 1 }, { duration: 200 })
    return
  }
  await d.tween(
    root,
    [
      { transform: T({ y: CY - 60, s: 1.24, r: -7 }), filter: 'brightness(1)', offset: 0.6 },
      { transform: T({ y: CY }), filter: 'brightness(1)' },
    ],
    { duration: 460, easing: 'cubic-bezier(.3,.9,.4,1)' },
  )
  d.shake(3, 150)
  d.burst(d.width / 2, CY + 150, {
    n: 16,
    colors: ['#9a9ab0', '#d4d4e0'],
    speed: [80, 200],
    angle: [-Math.PI, 0],
    gravity: 400,
    life: [0.3, 0.6],
    size: [1, 2],
    jx: 100,
  })
}

async function charge(d: Director, index: number, tier: TierFx): Promise<void> {
  const { root, aura, rings } = cardAt(d, index)
  const L = tier.level
  root.classList.add('is-lit')
  if (d.isReduced) {
    await d.tween(aura, { opacity: 0.35 + L * 0.08, transform: 'scale(1)' }, { duration: 320 })
    await d.wait(380)
    return
  }
  const duration = 440 + L * 300
  const ringCount = L + 1
  d.fire(
    d.tween(
      aura,
      [
        { opacity: 0, transform: 'scale(.8)' },
        { opacity: Math.min(1, 0.5 + L * 0.1), transform: `scale(${1 + L * 0.04})` },
      ],
      { duration },
    ),
  )
  if (L >= 3) d.rays(tier.color, 0.22 + (L - 3) * 0.12, duration)
  for (let r = 0; r < ringCount; r++) {
    const ring = document.createElement('div')
    ring.className = 'ar-ring'
    rings.append(ring)
    const drop = () => ring.remove()
    d.animate(
      ring,
      [
        { transform: 'scale(1)', opacity: 0.95 },
        { transform: 'scale(1.55)', opacity: 0 },
      ],
      { duration: 640, easing: 'cubic-bezier(.2,.8,.3,1)' },
    ).finished.then(drop, drop)
    d.fire(
      d.tween(
        root,
        [{ transform: T({ y: CY, s: 1.06 }), offset: 0.35 }, { transform: T({ y: CY }) }],
        { duration: 180 },
      ),
    )
    d.burst(d.width / 2, CY - 150, {
      n: 6 + L * 5,
      colors: tier.particles,
      speed: [160, 340],
      angle: [-Math.PI * 0.85, -Math.PI * 0.15],
      gravity: 700,
      life: [0.5, 0.9],
      size: [1.4, 3],
      jx: 100,
    })
    if (L >= 3) d.tint(tier, r % 2 ? 0.2 : 0.45 + (L - 3) * 0.15, 120)
    if (L >= 4) d.shake(3 + r * 1.4, 200)
    await d.wait(duration / ringCount)
  }
}

async function flip(d: Director, index: number, tier: TierFx, name: string): Promise<void> {
  const { root, aura, flipper } = cardAt(d, index)
  const L = tier.level
  if (d.isReduced) {
    root.classList.add('is-face')
    showStamp(d, tier, name)
    await d.wait(320)
    return
  }
  d.fire(
    d.tween(
      root,
      [{ transform: T({ y: CY - 40, s: 1.16 }), offset: 0.4 }, { transform: T({ y: CY }) }],
      { duration: 660, easing: 'cubic-bezier(.2,.7,.3,1.1)' },
    ),
  )
  await d.tween(flipper, [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(540deg)' }], {
    duration: 660,
    easing: 'cubic-bezier(.2,.7,.2,1)',
  })
  d.flash(0.2 + L * 0.08, 360)
  d.shake(L >= 3 ? 5 + (L - 3) * 3 : 2, 320)
  d.burst(d.width / 2, CY, {
    n: 20 + L * 26,
    kind: 'confetti',
    colors: L >= 4 ? [...tier.particles, '#ffffff'] : tier.particles,
    speed: [200, 420 + L * 60],
    gravity: 800,
    drag: 1.4,
    life: [0.8, 1.4],
    size: [2.5, 4.5],
    jx: 60,
  })
  d.fire(d.tween(aura, { opacity: 0.35 + L * 0.07, transform: 'scale(1)' }, { duration: 500 }))
  d.rays(tier.color, L >= 3 ? 0.12 : 0, 800)
  d.tint(tier, L >= 3 ? 0.2 : 0, 600)
  showStamp(d, tier, name)
}

/** Long reveal of a card new to the collection: rise, tier aura build-up, then the flip. */
export async function revealLong(
  d: Director,
  index: number,
  tier: TierFx,
  name: string,
): Promise<void> {
  await present(d, index)
  await charge(d, index, tier)
  await flip(d, index, tier, name)
}

/** Flat reveal of a card already owned: the face settles in the center without build-up. */
export async function revealFlat(d: Director, index: number): Promise<void> {
  const { root, flipper } = cardAt(d, index)
  root.style.zIndex = '22'
  root.classList.add('is-face')
  flipper.style.transform = 'rotateY(180deg)'
  root.style.filter = 'none'
  layoutDeck(d, index + 1, true, 300)
  if (d.isReduced) {
    root.style.transform = T({ y: CY })
    await d.tween(root, [{ opacity: 0 }, { opacity: 1 }], { duration: 160 })
    return
  }
  await d.tween(
    root,
    [
      { transform: T({ y: CY, s: 0.94 }), opacity: 0 },
      { transform: T({ y: CY }), opacity: 1 },
    ],
    { duration: 180, easing: 'cubic-bezier(.2,.8,.3,1)' },
  )
}

function slotOffset(d: Director, index: number): { x: number; y: number } {
  const slot = d.layers.slots[index]
  if (!slot) return { x: 0, y: 0 }
  const stage = d.layers.stage.getBoundingClientRect()
  const rect = slot.getBoundingClientRect()
  return {
    x: rect.left + rect.width / 2 - (stage.left + stage.width / 2),
    y: rect.top + rect.height / 2 - stage.top,
  }
}

/** Sends the revealed card to its slot in the hand and re-fans the deck. */
export async function stash(d: Director, index: number, tier: TierFx): Promise<void> {
  const { root, aura } = cardAt(d, index)
  const { stamp } = d.layers
  d.fire(
    d.tween(
      stamp,
      { opacity: 0, transform: 'translate(-50%, -50%) scale(.6) rotate(-8deg)' },
      { duration: 160 },
    ),
  )
  d.rays(null, 0, 250)
  d.tint(null, 0, 250)
  if (d.isReduced) {
    await d.tween(root, { opacity: 0 }, { duration: 200 })
  } else {
    const slot = slotOffset(d, index)
    root.style.zIndex = '29'
    d.fire(d.tween(aura, { opacity: 0 }, { duration: 160 }))
    await d.tween(
      root,
      [
        { transform: T({ y: CY + 20, s: 0.92, r: -4 }), offset: 0.2 },
        { transform: T({ x: slot.x, y: slot.y, s: SLOT_SCALE, r: 20 }) },
      ],
      { duration: 400, easing: 'cubic-bezier(.6,0,.4,1)' },
    )
    d.burst(d.width / 2 + slot.x, slot.y, {
      n: 14,
      kind: 'spark',
      colors: tier.particles,
      speed: [80, 200],
      life: [0.25, 0.5],
      size: [1, 2],
    })
  }
  root.style.visibility = 'hidden'
  layoutDeck(d, index + 1, false, 300)
}
