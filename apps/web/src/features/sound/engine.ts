import { logger } from '@/lib/logger'
import { renderSound } from './library'
import { debounceKey, type SoundRequest } from './sound-types'
import { Voice, createNoiseBuffer } from './synth'

const DEBOUNCE_MS = 80
const MAX_VOICES = 8
const PITCH_SPREAD = 0.03
const START_LEAD = 0.02

interface WindowWithWebkitAudio {
  webkitAudioContext?: typeof AudioContext
}

/** Live AudioContext engine: one context, a limiter, a master volume and voice bookkeeping. */
export interface SoundEngine {
  unlock: () => Promise<boolean>
  play: (request: SoundRequest, delay: number) => void
  setVolume: (volume: number) => void
  stopAll: () => void
}

interface Graph {
  ctx: AudioContext
  master: GainNode
  limiter: DynamicsCompressorNode
  noise: AudioBuffer
}

const STOP_FADE = 0.03

function createMaster(ctx: AudioContext, limiter: AudioNode, volume: number): GainNode {
  const master = ctx.createGain()
  master.gain.value = volume
  master.connect(limiter)
  return master
}

function contextClass(): typeof AudioContext | undefined {
  return window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext
}

function setAmbientSession(): void {
  const session: unknown = Reflect.get(navigator, 'audioSession')
  if (typeof session !== 'object' || session === null || !('type' in session)) return
  try {
    Reflect.set(session, 'type', 'ambient')
  } catch (error) {
    logger.debug('Ambient audio session unavailable', { error })
  }
}

function buildGraph(volume: number): Graph | null {
  const AudioContextClass = contextClass()
  if (!AudioContextClass) return null
  setAmbientSession()
  const ctx = new AudioContextClass()
  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -12
  limiter.knee.value = 6
  limiter.ratio.value = 10
  limiter.attack.value = 0.003
  limiter.release.value = 0.2
  limiter.connect(ctx.destination)
  const master = createMaster(ctx, limiter, volume)
  return { ctx, master, limiter, noise: createNoiseBuffer(ctx) }
}

function playSilentSample(ctx: AudioContext): void {
  const source = ctx.createBufferSource()
  source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
  source.connect(ctx.destination)
  source.start(0)
}

/** Random playback-rate factor within ±3 %. */
export function varyPitch(random: () => number = Math.random): number {
  return 1 + (random() * 2 - 1) * PITCH_SPREAD
}

/** Creates the engine; the AudioContext itself is created on first unlock or play. */
export function createSoundEngine(initialVolume: number): SoundEngine {
  let graph: Graph | null = null
  let volume = initialVolume
  let voiceEnds: readonly number[] = []
  let lastPlayed: ReadonlyMap<string, number> = new Map()

  function ensureGraph(): Graph | null {
    graph ??= buildGraph(volume)
    return graph
  }

  function resume(ctx: AudioContext): Promise<boolean> {
    if (ctx.state === 'running') return Promise.resolve(true)
    return ctx.resume().then(
      () => ctx.state === 'running',
      () => false,
    )
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && graph) void resume(graph.ctx)
  })

  return {
    unlock() {
      const current = ensureGraph()
      if (!current) return Promise.resolve(false)
      const resumed = resume(current.ctx)
      playSilentSample(current.ctx)
      return resumed
    },
    play(request, delay) {
      const current = ensureGraph()
      if (!current) return
      const { ctx, master, noise } = current
      if (ctx.state !== 'running') void resume(ctx)
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
      if (!graph) return
      const { ctx, master, limiter } = graph
      const now = ctx.currentTime
      master.gain.cancelScheduledValues(now)
      master.gain.setValueAtTime(master.gain.value, now)
      master.gain.linearRampToValueAtTime(0, now + STOP_FADE)
      setTimeout(() => master.disconnect(), STOP_FADE * 4000)
      graph = { ...graph, master: createMaster(ctx, limiter, volume) }
      voiceEnds = []
    },
    setVolume(next) {
      volume = next
      if (graph) graph.master.gain.setTargetAtTime(next, graph.ctx.currentTime, 0.02)
    },
  }
}
