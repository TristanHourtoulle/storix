import { logger } from '@/lib/logger'
import { createParticles, type Particles } from './particles'
import type { TierFx } from './tiers'

type Animatable = HTMLElement | SVGElement

export interface CardLayer {
  root: HTMLDivElement
  aura: HTMLDivElement
  flipper: HTMLDivElement
  rings: HTMLDivElement
}

export interface PackLayer {
  halo: HTMLDivElement
  wrap: HTMLDivElement
  pips: HTMLDivElement
  pipDots: HTMLSpanElement[]
  crackGroups: SVGGElement[]
  shards: HTMLDivElement[]
}

export interface ArcadeLayers {
  stage: HTMLDivElement
  world: HTMLDivElement
  tint: HTMLDivElement
  rays: HTMLDivElement
  flash: HTMLDivElement
  stamp: HTMLParagraphElement
  slots: HTMLDivElement[]
  cards: CardLayer[]
  pack: PackLayer
}

export interface Pose {
  x?: number
  y?: number
  s?: number
  r?: number
}

const STALE = Symbol('stale')

/** True when an error only means the run was cancelled. */
export function isStale(error: unknown): boolean {
  return error === STALE
}

/** Formats a pose as a CSS transform. */
export function toTransform({ x = 0, y = 0, s = 1, r = 0 }: Pose): string {
  return `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`
}

function one<T extends Element>(root: Element, selector: string): T {
  const node = root.querySelector<T>(selector)
  if (!node) throw new Error(`Arcade layer missing: ${selector}`)
  return node
}

function all<T extends Element>(root: Element, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector))
}

/** Collects the DOM layers rendered by the arcade stage. */
export function collectLayers(stage: HTMLDivElement): ArcadeLayers {
  return {
    stage,
    world: one(stage, '.ar-world'),
    tint: one(stage, '.ar-tint'),
    rays: one(stage, '.ar-rays'),
    flash: one(stage, '.ar-flash'),
    stamp: one(stage, '.ar-stamp'),
    slots: all(stage, '.ar-slot'),
    cards: all<HTMLDivElement>(stage, '.ar-card').map((root) => ({
      root,
      aura: one(root, '.ar-aura'),
      flipper: one(root, '.ar-flipper'),
      rings: one(root, '.ar-rings'),
    })),
    pack: {
      halo: one(stage, '.ar-pack-halo'),
      wrap: one(stage, '.ar-pack-wrap'),
      pips: one(stage, '.ar-pips'),
      pipDots: all(stage, '.ar-pip'),
      crackGroups: all(stage, '.ar-cracks g'),
      shards: all(stage, '.ar-shard'),
    },
  }
}

function toKebab(key: string): string {
  return key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
}

function applyFinal(el: Animatable, frame: Keyframe): void {
  for (const [key, value] of Object.entries(frame)) {
    if (key === 'offset' || key === 'easing' || key === 'composite' || value == null) continue
    el.style.setProperty(toKebab(key), String(value))
  }
}

/**
 * Owns one run of the arcade choreography: Web Animations, screen effects and particles.
 * `destroy` cancels everything and makes pending waits and tweens reject as stale.
 */
export class Director {
  readonly fx: Particles | null
  private isAlive = true
  private readonly running = new WeakMap<Animatable, Animation>()
  private readonly live = new Set<Animation>()
  private readonly timers = new Set<ReturnType<typeof setTimeout>>()

  constructor(
    readonly layers: ArcadeLayers,
    readonly isReduced: boolean,
    canvas: HTMLCanvasElement | null,
  ) {
    this.fx = isReduced || !canvas ? null : createParticles(canvas)
  }

  get width(): number {
    return this.layers.stage.clientWidth
  }

  destroy(): void {
    this.isAlive = false
    this.timers.forEach(clearTimeout)
    this.timers.clear()
    this.live.forEach((animation) => animation.cancel())
    this.live.clear()
    this.fx?.destroy()
  }

  wait(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.timers.delete(timer)
        if (this.isAlive) resolve()
        else reject(STALE)
      }, ms)
      this.timers.add(timer)
    })
  }

  animate(el: Animatable, frames: Keyframe[], options: KeyframeAnimationOptions): Animation {
    const animation = el.animate(frames, options)
    this.live.add(animation)
    const forget = () => this.live.delete(animation)
    animation.finished.then(forget, forget)
    return animation
  }

  tween(
    el: Animatable,
    frames: Keyframe | Keyframe[],
    options: KeyframeAnimationOptions = {},
  ): Promise<void> {
    if (!this.isAlive) return Promise.reject(STALE)
    const keyframes = Array.isArray(frames) ? frames : [frames]
    const previous = this.running.get(el)
    if (previous && previous.playState === 'running') {
      if (el.isConnected) previous.commitStyles()
      previous.cancel()
    }
    const animation = this.animate(el, keyframes, {
      duration: 400,
      easing: 'ease',
      fill: 'forwards',
      ...options,
    })
    this.running.set(el, animation)
    return animation.finished.then(
      () => {
        const last = keyframes[keyframes.length - 1]
        if (last) applyFinal(el, last)
        animation.cancel()
        if (this.running.get(el) === animation) this.running.delete(el)
        if (!this.isAlive) throw STALE
      },
      () => {
        if (!this.isAlive) throw STALE
      },
    )
  }

  fire(promise: Promise<void>): void {
    promise.catch((error: unknown) => {
      if (!isStale(error)) logger.error('Booster animation failed', { error })
    })
  }

  shake(amplitude: number, duration: number): void {
    if (this.isReduced || !this.isAlive) return
    const steps = Math.max(4, Math.round(duration / 40))
    const frames = Array.from({ length: steps }, (_, index): Keyframe => {
      const d = amplitude * (1 - index / steps)
      const dx = (Math.random() * 2 - 1) * d
      const dy = (Math.random() * 2 - 1) * d
      const rot = (Math.random() * 2 - 1) * d * 0.12
      return {
        transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${rot.toFixed(2)}deg)`,
      }
    })
    this.animate(this.layers.world, [...frames, { transform: 'none' }], {
      duration,
      easing: 'linear',
    })
  }

  flash(peak: number, duration: number): void {
    if (this.isReduced || !this.isAlive) return
    this.animate(
      this.layers.flash,
      [{ opacity: 0 }, { opacity: peak, offset: 0.22 }, { opacity: 0 }],
      { duration, easing: 'ease-out' },
    )
  }

  rays(color: string | null, opacity: number, duration: number): void {
    if (this.isReduced) return
    const { rays } = this.layers
    if (color) rays.style.setProperty('--rc', color)
    if (opacity > 0) rays.classList.add('is-on')
    this.fire(
      this.tween(rays, { opacity }, { duration }).then(() => {
        if (opacity === 0) rays.classList.remove('is-on')
      }),
    )
  }

  tint(tier: TierFx | null, opacity: number, duration: number): void {
    if (this.isReduced) return
    const { tint } = this.layers
    if (tier) {
      tint.classList.toggle('is-rainbow', tier.key === 'M')
      tint.style.setProperty('--rc', tier.color)
    }
    this.fire(this.tween(tint, { opacity }, { duration }))
  }

  burst(...args: Parameters<Particles['burst']>): void {
    this.fx?.burst(...args)
  }
}
