import { midiToHz as N, type Voice } from './synth'

export const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24] as const

function pent(index: number): number {
  return PENTATONIC[index % PENTATONIC.length] ?? 0
}

/** One of the three pack hits; the pitch climbs with the step (0 to 2). */
export function packTap(v: Voice, step: number): number {
  v.thump(0, 0.35, 130 + step * 20)
  v.tone({ f: N(64 + step * 5), d: 0.07, type: 'square', g: 0.08, lp: 3000 })
  v.noise({ d: 0.06, g: 0.25 + step * 0.05, f: 2400 + step * 600, q: 2 })
  return 0.2
}

/** The pack bursting open: low boom, falling noise sweep and an 8-bit arpeggio. */
export function burst(v: Voice): number {
  v.noise({ d: 0.6, g: 0.45, type: 'lowpass', f: 6000, f2: 300 })
  v.tone({ f: 180, f2: 40, d: 0.5, g: 0.55 })
  ;[72, 76, 79, 84].forEach((m, i) =>
    v.tone({ f: N(m), t: 0.05 + i * 0.05, d: 0.12, type: 'square', g: 0.06, lp: 4500 }),
  )
  return 0.65
}

/** A card landing face down; one semitone higher per card index. */
export function slam(v: Voice, index: number): number {
  v.thump(0, 0.5, 150 + index * 8)
  v.noise({ d: 0.05, g: 0.3, f: 1800 + index * 150, q: 1.4 })
  v.tone({ f: N(72 + index), d: 0.05, type: 'square', g: 0.04, lp: 2500 })
  return 0.2
}

/** Tier build-up riser of `d` seconds, from common (0) to mythic (5). */
export function aura(v: Voice, l: number, d: number): number {
  v.noise({ d, g: 0.05 + l * 0.03, a: d * 0.9, f: 500, f2: 1500 + l * 1400, q: 1.2 + l * 0.3 })
  if (l >= 1) {
    v.tone({
      f: N(55),
      f2: N(67 + l * 2),
      d,
      type: 'triangle',
      g: 0.05 + l * 0.025,
      a: d * 0.9,
      vib: l >= 3 ? 15 + l * 5 : 0,
      vibRate: 4 + l * 2,
    })
  }
  if (l >= 2) {
    v.tone({
      f: N(62),
      f2: N(74 + l * 2),
      d,
      type: 'sawtooth',
      g: 0.03 + l * 0.01,
      a: d * 0.9,
      lp: 600,
      lp2: 1500 + l * 800,
    })
  }
  if (l >= 3) v.tone({ f: N(36), d, g: 0.12 + l * 0.03, a: d * 0.8 })
  if (l >= 4) {
    const sparkles = 6 + (l - 4) * 8
    Array.from({ length: sparkles }, (_, i) =>
      v.tone({ f: N(84 + pent(i * 3)), t: d * (0.35 + (0.6 * i) / sparkles), d: 0.25, g: 0.035 }),
    )
  }
  if (l >= 5) {
    ;[0, 7, 12, 16].forEach((iv, k) =>
      v.tone({
        f: N(48 + iv),
        f2: N(60 + iv),
        d,
        type: 'sawtooth',
        g: 0.03,
        a: d * 0.95,
        det: k % 2 ? 8 : -8,
        lp: 400,
        lp2: 4000,
      }),
    )
  }
  return d + 0.25
}

function stampLow(v: Voice, l: number): void {
  if (l === 0) v.tone({ f: N(67), t: 0.04, d: 0.3, type: 'triangle', g: 0.14 })
  if (l === 1) {
    ;[67, 71].forEach((m, i) =>
      v.tone({ f: N(m), t: 0.04 + i * 0.08, d: 0.32, type: 'triangle', g: 0.14 }),
    )
  }
  if (l === 2) {
    ;[72, 76, 79].forEach((m, i) =>
      v.tone({ f: N(m), t: 0.04 + i * 0.06, d: 0.25, type: 'square', g: 0.06, lp: 3500 }),
    )
    ;[72, 76, 79].forEach((m) => v.tone({ f: N(m), t: 0.22, d: 0.35, type: 'triangle', g: 0.07 }))
  }
  if (l === 3) {
    ;[72, 76, 79, 83].forEach((m, i) =>
      v.tone({ f: N(m), t: 0.04 + i * 0.055, d: 0.25, type: 'square', g: 0.055, lp: 3500 }),
    )
    v.tone({ f: N(86), t: 0.26, d: 0.6, type: 'triangle', g: 0.12, vib: 25, vibRate: 7 })
    v.tone({ f: N(74), t: 0.26, d: 0.6, type: 'sine', g: 0.08 })
  }
}

function stampLegendary(v: Voice): void {
  ;[67, 72, 76, 79].forEach((m, k) =>
    v.tone({
      f: N(m),
      t: 0.03,
      d: 1.0,
      type: 'sawtooth',
      g: 0.05,
      a: 0.03,
      det: k % 2 ? 6 : -6,
      lp: 1200,
      lp2: 2800,
    }),
  )
  ;[79, 84, 88, 91].forEach((m, i) =>
    v.tone({ f: N(m), t: 0.05 + i * 0.06, d: 0.2, type: 'square', g: 0.05, lp: 4000 }),
  )
  Array.from({ length: 7 }, (_, i) => v.bell(N(96 + pent((i * 2) % 8)), 0.35 + i * 0.07, 0.4, 0.04))
}

function stampMythic(v: Voice): void {
  v.thump(0.2, 0.6, 120)
  v.tone({ f: N(36), d: 1.3, g: 0.25, a: 0.02 })
  ;[60, 67, 72, 76, 79, 84].forEach((m, k) =>
    v.tone({
      f: N(m),
      t: 0.03,
      d: 1.5,
      type: 'sawtooth',
      g: 0.04,
      a: 0.04,
      det: k % 2 ? 7 : -7,
      lp: 1200,
      lp2: 5000,
      vib: 12,
      vibRate: 5,
    }),
  )
  ;[72, 76, 79, 84, 88, 91].forEach((m, i) =>
    v.tone({ f: N(m), t: 0.05 + i * 0.05, d: 0.2, type: 'square', g: 0.045, lp: 4500 }),
  )
  Array.from({ length: 14 }, (_, i) => v.bell(N(88 + pent(i)), 0.4 + i * 0.06, 0.45, 0.035))
}

const STAMP_DURATIONS = [0.35, 0.42, 0.6, 0.9, 1.1, 1.6] as const

/** Rarity stamp hitting the revealed card, from common (0) to mythic (5). */
export function stamp(v: Voice, l: number): number {
  v.thump(0, 0.5 + l * 0.05)
  v.noise({ d: 0.08, g: 0.2 + l * 0.04, type: 'lowpass', f: 2500 + l * 600 })
  if (l <= 3) stampLow(v, l)
  if (l === 4) stampLegendary(v)
  if (l >= 5) stampMythic(v)
  return STAMP_DURATIONS[Math.min(l, 5)] ?? 1.6
}

/** Paper card flip: high-passed swish, a crisp click at turnover and a faint landing tap. */
export function flip(v: Voice): number {
  v.noise({ d: 0.11, g: 0.2, a: 0.006, f: 2000, f2: 6000, q: 1.1, hp: 1500 })
  v.noise({ t: 0.07, d: 0.012, g: 0.28, a: 0.001, type: 'highpass', f: 4500 })
  v.tone({ f: 3400, t: 0.07, d: 0.012, type: 'triangle', g: 0.03, a: 0.001 })
  v.noise({ t: 0.15, d: 0.03, g: 0.06, a: 0.002, f: 2600, q: 2.5, hp: 1500 })
  return 0.2
}

/** Two-note arcade coin. */
export function coin(v: Voice, t0 = 0, g = 0.09): number {
  v.tone({ f: N(83), t: t0, d: 0.07, type: 'square', g, lp: 5000 })
  v.tone({ f: N(88), t: t0 + 0.07, d: 0.28, type: 'square', g, lp: 5000 })
  return t0 + 0.35
}

/** One fast cascade for "Tout révéler", whatever the number of cards. */
export function revealAll(v: Voice): number {
  Array.from({ length: 8 }, (_, i) => {
    v.noise({ t: i * 0.065, d: 0.06, g: 0.12, f: 2000 + i * 300, q: 2 })
    v.tone({ f: N(72 + pent(i)), t: i * 0.065, d: 0.07, type: 'square', g: 0.045, lp: 4000 })
  })
  ;[72, 76, 79, 84].forEach((m) => v.tone({ f: N(m), t: 0.55, d: 0.35, type: 'triangle', g: 0.07 }))
  return 0.9
}

/** End-of-level jingle on the booster summary. */
export function summary(v: Voice): number {
  ;[72, 76, 79, 84].forEach((m, i) =>
    v.tone({ f: N(m), t: i * 0.09, d: 0.12, type: 'square', g: 0.07, lp: 4000 }),
  )
  ;[72, 76, 79, 84].forEach((m) =>
    v.tone({ f: N(m), t: 0.36, d: 0.5, type: 'square', g: 0.035, lp: 3000 }),
  )
  v.thump(0.36, 0.3)
  return 0.86
}

/** "Épique garantie": a rising gauge then a vibrating violet chord. */
export function pity(v: Voice): number {
  v.tone({ f: N(60), f2: N(84), d: 0.5, type: 'triangle', g: 0.1, a: 0.4 })
  ;[76, 80, 83].forEach((m) =>
    v.tone({ f: N(m), t: 0.5, d: 0.45, type: 'triangle', g: 0.07, vib: 20, vibRate: 7 }),
  )
  return 0.95
}
