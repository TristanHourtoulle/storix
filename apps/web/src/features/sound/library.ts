import * as booster from './library-booster'
import type { SoundRequest } from './sound-types'
import { midiToHz as N, times, type Voice } from './synth'

function blip(v: Voice, m: number, t = 0, d = 0.1, g = 0.06, lp = 4000): void {
  v.tone({ f: N(m), t, d, type: 'square', g, lp })
}

function boosterReady(v: Voice): number {
  ;[76, 79, 84].forEach((m, i) => blip(v, m, i * 0.06, 0.09, 0.06))
  return booster.coin(v, 0.18, 0.08)
}

function countdownEnd(v: Voice): number {
  ;[0, 0.25, 0.5].forEach((t) => v.noise({ t, d: 0.03, g: 0.18, type: 'highpass', f: 4000 }))
  return booster.coin(v, 0.75, 0.1)
}

function locked(v: Voice): number {
  v.tone({ f: 95, f2: 60, d: 0.12, g: 0.35, lp: 400 })
  v.noise({ d: 0.04, g: 0.08, type: 'lowpass', f: 400 })
  return 0.15
}

function reactFire(v: Voice): number {
  times(5, (i) => v.noise({ t: i * 0.035, d: 0.03, g: 0.12, f: 900 + i * 300, q: 3 }))
  v.noise({ d: 0.2, g: 0.06, type: 'lowpass', f: 800 })
  return 0.22
}

function reactHeart(v: Voice): number {
  v.tone({ f: N(76), d: 0.1, g: 0.12 })
  v.tone({ f: N(81), t: 0.09, d: 0.12, g: 0.12 })
  return 0.22
}

function reactStar(v: Voice): number {
  blip(v, 96, 0, 0.06, 0.04, 6000)
  blip(v, 100, 0.06, 0.06, 0.04, 6000)
  blip(v, 103, 0.12, 0.14, 0.04, 6000)
  return 0.28
}

function photoAdded(v: Voice): number {
  v.tone({ f: 400, f2: 900, d: 0.07, g: 0.12 })
  v.noise({ d: 0.015, g: 0.05, type: 'highpass', f: 5000 })
  return 0.1
}

function cardCreated(v: Voice): number {
  ;[79, 83, 86, 91].forEach((m, i) => blip(v, m, i * 0.05, i === 3 ? 0.3 : 0.08, 0.06))
  v.noise({ t: 0.1, d: 0.4, g: 0.03, type: 'highpass', f: 7000 })
  return 0.6
}

function quota(v: Voice): number {
  v.tone({ f: N(67), d: 0.18, type: 'triangle', g: 0.1, lp: 1500 })
  v.tone({ f: N(62), t: 0.13, d: 0.22, type: 'triangle', g: 0.1, lp: 1500 })
  return 0.35
}

function cardRemoved(v: Voice): number {
  v.noise({ d: 0.3, g: 0.12, f: 1800, f2: 400 })
  return booster.coin(v, 0.25, 0.08)
}

function pinMythic(v: Voice): number {
  v.thump(0, 0.45, 120)
  ;[60, 67, 72, 76].forEach((m, k) =>
    v.tone({
      f: N(m),
      d: 1.0,
      type: 'sawtooth',
      g: 0.04,
      a: 0.03,
      det: k % 2 ? 7 : -7,
      lp: 900,
      lp2: 3500,
    }),
  )
  times(6, (i) => v.bell(N(91 + (booster.PENTATONIC[i] ?? 0)), 0.3 + i * 0.07, 0.4, 0.035))
  return 1.1
}

function tap(v: Voice): number {
  v.noise({ d: 0.015, g: 0.08, type: 'highpass', f: 4000 })
  v.tone({ f: 1800, d: 0.02, g: 0.03 })
  return 0.03
}

function confirm(v: Voice): number {
  blip(v, 84, 0, 0.06, 0.04, 3000)
  blip(v, 88, 0.05, 0.1, 0.04, 3000)
  return 0.15
}

function error(v: Voice): number {
  v.tone({ f: N(52), d: 0.12, type: 'square', g: 0.06, lp: 900 })
  v.tone({ f: N(49), t: 0.1, d: 0.15, type: 'square', g: 0.06, lp: 900 })
  return 0.25
}

function destructive(v: Voice): number {
  v.tone({ f: 220, f2: 110, d: 0.25, g: 0.12, type: 'triangle' })
  v.noise({ d: 0.12, g: 0.05, type: 'lowpass', f: 700 })
  return 0.3
}

/** Schedules a sound on a voice and returns its length in seconds. */
export function renderSound(v: Voice, request: SoundRequest): number {
  switch (request.name) {
    case 'packTap':
      return booster.packTap(v, request.step)
    case 'burst':
      return booster.burst(v)
    case 'slam':
      return booster.slam(v, request.index)
    case 'aura':
      return booster.aura(v, request.level, request.duration)
    case 'flip':
      return booster.flip(v)
    case 'stamp':
      return booster.stamp(v, request.level)
    case 'coin':
      return booster.coin(v)
    case 'revealAll':
      return booster.revealAll(v)
    case 'summary':
      return booster.summary(v)
    case 'pity':
      return booster.pity(v)
    case 'boosterReady':
      return boosterReady(v)
    case 'countdownEnd':
      return countdownEnd(v)
    case 'locked':
      return locked(v)
    case 'reactFire':
      return reactFire(v)
    case 'reactHeart':
      return reactHeart(v)
    case 'reactStar':
      return reactStar(v)
    case 'photoAdded':
      return photoAdded(v)
    case 'cardCreated':
      return cardCreated(v)
    case 'quota':
      return quota(v)
    case 'cardRemoved':
      return cardRemoved(v)
    case 'pinMythic':
      return pinMythic(v)
    case 'tap':
      return tap(v)
    case 'confirm':
      return confirm(v)
    case 'error':
      return error(v)
    case 'destructive':
      return destructive(v)
  }
}
