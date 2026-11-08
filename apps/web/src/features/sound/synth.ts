type FilterKind = 'lowpass' | 'highpass' | 'bandpass'

export interface ToneSpec {
  f: number
  f2?: number
  t?: number
  d?: number
  type?: OscillatorType
  g?: number
  a?: number
  det?: number
  lp?: number
  lp2?: number
  hp?: number
  q?: number
  vib?: number
  vibRate?: number
}

export interface NoiseSpec {
  t?: number
  d?: number
  g?: number
  a?: number
  type?: FilterKind
  f?: number
  f2?: number
  q?: number
  hp?: number
}

const NODE_TAIL = 0.05

/** Runs `step` for each index from 0 to `count - 1`. */
export function times(count: number, step: (index: number) => void): void {
  for (let index = 0; index < count; index += 1) step(index)
}

/** Frequency in hertz of a MIDI note number. */
export function midiToHz(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12)
}

/**
 * One playback of a sound: every node starts relative to `base` (AudioContext time),
 * with all oscillator and noise-filter frequencies scaled by `pitch`.
 */
export class Voice {
  constructor(
    private readonly ctx: AudioContext,
    private readonly output: AudioNode,
    private readonly noiseBuffer: AudioBuffer,
    private readonly base: number,
    private readonly pitch: number,
  ) {}

  private filter(
    kind: FilterKind,
    f: number,
    f2: number | undefined,
    q: number,
    s: number,
    d: number,
  ) {
    const node = this.ctx.createBiquadFilter()
    node.type = kind
    node.frequency.setValueAtTime(f, s)
    if (f2) node.frequency.exponentialRampToValueAtTime(f2, s + d)
    node.Q.value = q
    return node
  }

  private envelope(s: number, attack: number, d: number, g: number): GainNode {
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0, s)
    gain.gain.linearRampToValueAtTime(g, s + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, s + d)
    gain.gain.linearRampToValueAtTime(0, s + d + 0.02)
    return gain
  }

  private wire(source: AudioNode, filters: readonly AudioNode[], gain: GainNode): void {
    const last = filters.reduce<AudioNode>((node, next) => node.connect(next), source)
    last.connect(gain)
    gain.connect(this.output)
  }

  /** Schedules an oscillator note with optional sweep, filters and vibrato. */
  tone({
    f,
    f2,
    t = 0,
    d = 0.2,
    type = 'sine',
    g = 0.2,
    a = 0.004,
    det = 0,
    lp,
    lp2,
    hp,
    q = 0.7,
    vib = 0,
    vibRate = 6,
  }: ToneSpec): void {
    const s = this.base + t
    const osc = this.ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(f * this.pitch, s)
    if (f2) osc.frequency.exponentialRampToValueAtTime(f2 * this.pitch, s + d)
    osc.detune.value = det
    const filters = [
      ...(lp ? [this.filter('lowpass', lp, lp2, q, s, d)] : []),
      ...(hp ? [this.filter('highpass', hp, undefined, q, s, d)] : []),
    ]
    this.wire(osc, filters, this.envelope(s, Math.min(a, d * 0.95), d, g))
    if (vib) {
      const lfo = this.ctx.createOscillator()
      lfo.frequency.value = vibRate
      const depth = this.ctx.createGain()
      depth.gain.value = vib
      lfo.connect(depth).connect(osc.detune)
      lfo.start(s)
      lfo.stop(s + d + NODE_TAIL)
    }
    osc.start(s)
    osc.stop(s + d + NODE_TAIL)
  }

  /** Schedules a filtered white-noise burst. */
  noise({
    t = 0,
    d = 0.2,
    g = 0.2,
    a = 0.003,
    type = 'bandpass',
    f = 1000,
    f2,
    q = 1,
    hp,
  }: NoiseSpec): void {
    const s = this.base + t
    const source = this.ctx.createBufferSource()
    source.buffer = this.noiseBuffer
    source.loop = true
    const shaped = this.filter(type, f * this.pitch, f2 ? f2 * this.pitch : undefined, q, s, d)
    const filters = hp ? [this.filter('highpass', hp, undefined, 0.7, s, d), shaped] : [shaped]
    this.wire(source, filters, this.envelope(s, Math.min(a, d * 0.95), d, g))
    source.start(s, Math.random() * 1.5)
    source.stop(s + d + NODE_TAIL)
  }

  /** Schedules a bell: a sine with two inharmonic partials kept below Nyquist. */
  bell(f: number, t = 0, d = 0.8, g = 0.12): void {
    const ceiling = (this.ctx.sampleRate / 2 - 500) / this.pitch
    this.tone({ f, t, d, g })
    if (f * 2.76 < ceiling) this.tone({ f: f * 2.76, t, d: d * 0.5, g: g * 0.3 })
    if (f * 5.4 < ceiling) this.tone({ f: f * 5.4, t, d: d * 0.25, g: g * 0.1 })
  }

  /** Schedules a low pitch-dropping thump. */
  thump(t = 0, g = 0.5, f = 160): void {
    this.tone({ f, f2: 45, t, d: 0.18, g })
  }
}

/** Builds a two-second mono white-noise buffer shared by every voice. */
export function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  buffer.getChannelData(0).forEach((_, index, data) => {
    data[index] = Math.random() * 2 - 1
  })
  return buffer
}
