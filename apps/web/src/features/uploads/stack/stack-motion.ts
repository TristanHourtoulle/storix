import { useSyncExternalStore } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

const COMMIT_MS = 280
const COMMIT_EASING = 'cubic-bezier(.2,.8,.2,1)'
const CANCEL_MS = 220
const CANCEL_EASING = 'cubic-bezier(.3,1.4,.5,1)'
const REMOVE_MS = 260
const REMOVE_EASING = 'cubic-bezier(.4,0,1,1)'
const FADE_MS = 150
const RUBBER_NUDGE_PX = 80

/** Resting transform of the card right under the top card. */
const UNDER_TRANSFORM = 'translateY(10px) scale(.94)'
const THROWN_TRANSFORM = 'translateX(150%) rotate(18deg)'
const DROPPED_TRANSFORM = 'translateY(40%) scale(.8)'

const held = new Set<Animation>()

/** Tells whether the user asked for reduced motion right now. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/** Live `prefers-reduced-motion` value. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false)
}

/** Rubber band offset for a drag past an edge. */
export function rubberBand(dx: number): number {
  return Math.sign(dx) * 56 * (1 - Math.exp(-Math.abs(dx) / 160))
}

interface Pose {
  transform: string
  opacity: string
}

function currentPose(el: HTMLElement): Pose {
  return {
    transform: el.style.transform || 'none',
    opacity: el.style.opacity || getComputedStyle(el).opacity,
  }
}

function clearInline(el: HTMLElement): void {
  el.style.transform = ''
  el.style.opacity = ''
  el.style.visibility = ''
  el.style.transition = ''
}

function restingPose(el: HTMLElement): Pose {
  const saved = { transform: el.style.transform, opacity: el.style.opacity }
  el.style.transform = ''
  el.style.opacity = ''
  const style = getComputedStyle(el)
  const pose = { transform: style.transform, opacity: style.opacity }
  el.style.transform = saved.transform
  el.style.opacity = saved.opacity
  return pose
}

async function play(
  el: HTMLElement,
  keyframes: Keyframe[],
  options: { duration: number; easing: string; hold: boolean },
): Promise<void> {
  const animation = el.animate(keyframes, {
    duration: options.duration,
    easing: options.easing,
    fill: options.hold ? 'forwards' : 'none',
  })
  if (options.hold) held.add(animation)
  try {
    await animation.finished
  } catch {
    held.delete(animation)
  } finally {
    clearInline(el)
  }
}

/**
 * Drops the final frames kept by commit animations and the drag styles of every card in the deck,
 * once the deck has re-rendered in its new order.
 */
export function settleMotion(deck: HTMLElement | null): void {
  held.forEach((animation) => animation.cancel())
  held.clear()
  deck?.querySelectorAll<HTMLElement>(':scope > *').forEach(clearInline)
}

function commit(el: HTMLElement, to: Partial<Pose>, reduced: boolean): Promise<void> {
  const from = currentPose(el)
  const target = reduced
    ? { transform: from.transform, opacity: to.opacity ?? '1' }
    : { transform: to.transform ?? from.transform, opacity: to.opacity ?? from.opacity }
  return play(
    el,
    [
      { ...from, visibility: 'visible' },
      { ...target, visibility: 'visible' },
    ],
    reduced
      ? { duration: FADE_MS, easing: 'linear', hold: true }
      : { duration: COMMIT_MS, easing: COMMIT_EASING, hold: true },
  )
}

function fadeIn(el: HTMLElement, transform: string): Promise<void> {
  return play(
    el,
    [
      { transform, opacity: '0', visibility: 'visible' },
      { transform, opacity: '1', visibility: 'visible' },
    ],
    { duration: FADE_MS, easing: 'linear', hold: true },
  )
}

/** Throws the top card off to the right while the next card rises to the top. */
export async function animateNext(
  top: HTMLElement,
  under: HTMLElement | null,
  reduced: boolean,
): Promise<void> {
  await Promise.all([
    commit(top, { transform: THROWN_TRANSFORM, opacity: '0' }, reduced),
    under ? animatePromote(under, reduced) : null,
  ])
}

/** Brings the previous card back from the right edge while the top card settles under it. */
export async function animatePrev(
  incoming: HTMLElement,
  top: HTMLElement,
  reduced: boolean,
): Promise<void> {
  incoming.style.visibility = 'visible'
  await Promise.all([
    reduced
      ? fadeIn(incoming, 'none')
      : commit(incoming, { transform: 'none', opacity: '1' }, false),
    reduced
      ? commit(top, { opacity: '0' }, true)
      : commit(top, { transform: UNDER_TRANSFORM, opacity: '1' }, false),
  ])
}

/** Raises the card under the top one, used when the top card leaves without a swipe. */
export function animatePromote(under: HTMLElement, reduced: boolean): Promise<void> {
  return reduced ? fadeIn(under, 'none') : commit(under, { transform: 'none', opacity: '1' }, false)
}

/** Drops the top card, a motion distinct from both navigation directions. */
export function animateRemove(top: HTMLElement, reduced: boolean): Promise<void> {
  if (reduced) return commit(top, { opacity: '0' }, true)
  const from = currentPose(top)
  return play(
    top,
    [
      { transform: from.transform, opacity: from.opacity },
      { transform: DROPPED_TRANSFORM, opacity: '0' },
    ],
    { duration: REMOVE_MS, easing: REMOVE_EASING, hold: true },
  )
}

/** Springs a dragged card back to its resting place; reduced motion resets at once. */
export function animateCancel(el: HTMLElement, reduced: boolean): Promise<void> {
  if (reduced || !el.style.transform) {
    clearInline(el)
    return Promise.resolve()
  }
  const from = currentPose(el)
  const rest = restingPose(el)
  return play(
    el,
    [
      {
        transform: from.transform,
        opacity: from.opacity,
        visibility: el.style.visibility || 'visible',
      },
      { transform: rest.transform, opacity: rest.opacity },
    ],
    { duration: CANCEL_MS, easing: CANCEL_EASING, hold: false },
  )
}

/** Shows that there is nothing before the first card: a spring back from the drag, or a short nudge. */
export function animateRubberBand(el: HTMLElement, reduced: boolean): Promise<void> {
  if (reduced) {
    clearInline(el)
    return Promise.resolve()
  }
  const from = currentPose(el).transform
  const keyframes: Keyframe[] =
    from === 'none'
      ? [
          { transform: 'none' },
          { transform: `translateX(${rubberBand(-RUBBER_NUDGE_PX)}px)` },
          { transform: 'none' },
        ]
      : [{ transform: from }, { transform: 'none' }]
  return play(el, keyframes, { duration: CANCEL_MS + 80, easing: CANCEL_EASING, hold: false })
}
