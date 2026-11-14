import { toTransform as T, type Director } from './director'
import { CENTER_Y as CY, deckPose } from './geometry'

const DEAL_DELAY_MS = 120
const DEAL_STAGGER_MS = 60
const DEAL_DURATION_MS = 820
const DEAL_LANDING_MS = 450
const FADE_DEAL_MS = 160

/** A random number between min and max. */
export function between(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function packParts(d: Director): HTMLElement[] {
  const { pack } = d.layers
  const tearParts = [pack.tearFx, pack.tearTop].filter((el): el is HTMLDivElement => el !== null)
  return [pack.halo, pack.wrap, pack.pips, ...pack.shards, ...tearParts]
}

/** Removes every piece of the pack from the stage once it is open. */
export function hidePack(d: Director): void {
  packParts(d).forEach((el) => {
    el.style.display = 'none'
  })
}

/** Reduced motion: fades the sealed pack out and shows the face-down deck at once. */
export async function fadePack(d: Director): Promise<void> {
  const { pack, cards } = d.layers
  const sealed = [pack.halo, pack.wrap, pack.pips, pack.tearFx].filter(
    (el): el is HTMLDivElement => el !== null,
  )
  sealed.forEach((el) => d.fire(d.tween(el, { opacity: 0 }, { duration: 240 })))
  await d.wait(FADE_DEAL_MS)
  cards.forEach(({ root }, index) => {
    d.sound({ name: 'slam', index }, (index * DEAL_STAGGER_MS) / 1000)
    const pose = deckPose(index, cards.length)
    root.style.transform = T(pose)
    root.style.zIndex = String(pose.z)
    d.fire(d.tween(root, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 }))
  })
  await d.wait(320)
}

/** Deals the face-down cards from the pack's centre into the fanned deck. */
export function dealCards(d: Director): void {
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
    d.sound({ name: 'slam', index }, (delay + DEAL_LANDING_MS) / 1000)
    d.fire(
      d.tween(root, [{ transform: mid, offset: 0.45 }, { transform: T(pose) }], {
        duration: DEAL_DURATION_MS,
        delay,
        easing: 'cubic-bezier(.2,.8,.3,1)',
      }),
    )
  })
}
