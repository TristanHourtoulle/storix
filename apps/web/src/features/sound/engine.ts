import { renderSound } from './library'
import { debounceKey, type SoundRequest } from './sound-types'
import { Voice, createNoiseBuffer } from './synth'

const DEBOUNCE_MS = 80
const MAX_VOICES = 8
const PITCH_SPREAD = 0.03
const START_LEAD = 0.02
const STOP_FADE = 0.03

/** Synth graph on an already unlocked AudioContext: limiter, master volume and voice bookkeeping. */
export interface SoundEngine {
  play: (request: SoundRequest, delay: number) => void
  setVolume: (volume: number) => void
  stopAll: () => void
}

function createLimiter(ctx: AudioContext): DynamicsCompressorNode {
  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -12
  limiter.knee.value = 6
  limiter.ratio.value = 10
  limiter.attack.value = 0.003
  limiter.release.value = 0.2
  limiter.connect(ctx.destination)
  return limiter
}

function createMaster(ctx: AudioContext, limiter: AudioNode, volume: number): GainNode {
  const master = ctx.createGain()
  master.gain.value = volume
  master.connect(limiter)
  return master
}

/** Random playback-rate factor within ±3 %. */
export function varyPitch(random: () => number = Math.random): number {
  return 1 + (random() * 2 - 1) * PITCH_SPREAD
}

/** Builds the synth graph on the shared AudioContext created by the gesture unlock. */
export function createSoundEngine(ctx: AudioContext, initialVolume: number): SoundEngine {
  const limiter = createLimiter(ctx)
  const noise = createNoiseBuffer(ctx)
  let volume = initialVolume
  let master = createMaster(ctx, limiter, volume)
  let voiceEnds: readonly number[] = []
  let lastPlayed: ReadonlyMap<string, number> = new Map()

  return {
    play(request, delay) {
      const key = debounceKey(request)
      const at = performance.now() + delay * 1000
      const previous = lastPlayed.get(key)
      if (previous !== undefined && Math.abs(at - previous) < DEBOUNCE_MS) return
      const start = ctx.currentTime + START_LEAD + delay
      voiceEnds = voiceEnds.filter((end) => end > ctx.currentTime)
      if (voiceEnds.length >= MAX_VOICES) return
      lastPlayed = new Map(lastPlayed).set(key, at)
      const length = renderSound(new Voice(ctx, master, noise, start, varyPitch()), request)
      voiceEnds = [...voiceEnds, start + length]
    },
    stopAll() {
      const old = master
      const now = ctx.currentTime
      old.gain.cancelScheduledValues(now)
      old.gain.setValueAtTime(old.gain.value, now)
      old.gain.linearRampToValueAtTime(0, now + STOP_FADE)
      setTimeout(() => old.disconnect(), STOP_FADE * 4000)
      master = createMaster(ctx, limiter, volume)
      voiceEnds = []
    },
    setVolume(next) {
      volume = next
      master.gain.setTargetAtTime(next, ctx.currentTime, 0.02)
    },
  }
}
