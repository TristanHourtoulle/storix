import { toTransform as T, type CardLayer, type Director } from './director'
import { CENTER_Y as CY, DIM_OPACITY, SLOT_SCALE, deckPose } from './geometry'
import type { TierFx } from './tiers'

function cardAt(d: Director, index: number): CardLayer {
  const card = d.layers.cards[index]
  if (!card) throw new Error(`Arcade card missing: ${index}`)
  return card
}

/** Re-fans the cards still in the deck, from `from` to the last one. */
export function layoutDeck(d: Director, from: number, isDimmed: boolean, duration: number): void {
  const rest = d.layers.cards.slice(from)
  const dim = isDimmed ? DIM_OPACITY : 0
  rest.forEach((card, k) => {
    const pose = deckPose(k, rest.length)
    card.root.style.zIndex = String(pose.z)
    if (d.isReduced) {
      card.root.style.transform = T(pose)
      card.dim.style.opacity = String(dim)
      return
    }
    const options = { duration, easing: 'cubic-bezier(.2,.8,.2,1)' }
    d.fire(d.tween(card.root, { transform: T(pose) }, options))
    d.fire(d.tween(card.dim, { opacity: dim }, options))
  })
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

function hideStamp(d: Director): void {
  const { stamp } = d.layers
  const hidden = { opacity: 0, transform: 'translate(-50%, -50%) scale(.6) rotate(-8deg)' }
  d.fire(
    d.tween(stamp, hidden, { duration: 160 }).then(() => {
      delete stamp.dataset.t
    }),
  )
}

async function present(d: Director, index: number): Promise<void> {
  const { root, dim } = cardAt(d, index)
  root.style.zIndex = '22'
  layoutDeck(d, index + 1, true, 350)
  if (d.isReduced) {
    await d.tween(root, { opacity: 0 }, { duration: 120 })
    root.style.transform = T({ y: CY })
    dim.style.opacity = '0'
    await d.tween(root, { opacity: 1 }, { duration: 200 })
    return
  }
  d.fire(d.tween(dim, { opacity: 0 }, { duration: 280 }))
  await d.tween(
    root,
    [{ transform: T({ y: CY - 60, s: 1.24, r: -7 }), offset: 0.6 }, { transform: T({ y: CY }) }],
    { duration: 460, easing: 'cubic-bezier(.3,.9,.4,1)' },
  )
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

function spawnRing(d: Director, rings: HTMLDivElement): void {
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
    spawnRing(d, rings)
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

async function crossfadeToFace(d: Director, card: CardLayer, duration: number): Promise<void> {
  d.fire(d.tween(card.back, { opacity: 0 }, { duration }))
  await d.tween(card.front, [{ opacity: 0 }, { opacity: 1 }], { duration })
}

async function flip(d: Director, index: number, tier: TierFx, name: string): Promise<void> {
  const card = cardAt(d, index)
  const { root, aura, flipper } = card
  const L = tier.level
  if (d.isReduced) {
    await crossfadeToFace(d, card, 280)
    showStamp(d, tier, name)
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
  if (L >= 4) d.shake(5 + (L - 4) * 3, 320)
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
  const card = cardAt(d, index)
  const { root, flipper, dim } = card
  root.style.zIndex = '22'
  dim.style.opacity = '0'
  layoutDeck(d, index + 1, true, 300)
  if (d.isReduced) {
    card.front.style.opacity = '1'
    card.back.style.opacity = '0'
    root.style.transform = T({ y: CY })
    await d.tween(root, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 })
    return
  }
  flipper.style.transform = 'rotateY(180deg)'
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
    x: (rect.left + rect.width / 2 - (stage.left + stage.width / 2)) / d.scale,
    y: (rect.top + rect.height / 2 - stage.top) / d.scale,
  }
}

/** Sends the revealed card to its slot in the hand, ends its effects and re-fans the deck. */
export async function stash(d: Director, index: number, tier: TierFx): Promise<void> {
  const { root, aura } = cardAt(d, index)
  hideStamp(d)
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
  root.classList.remove('is-lit')
  root.style.display = 'none'
  layoutDeck(d, index + 1, false, 300)
}
