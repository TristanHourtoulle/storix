import { logger } from '@/lib/logger'
import { setUiSoundHandler } from '@/lib/ui-sound'
import { installAudioUnlock, playableContext, suspendAudio, unlockAudioNow } from './audio-unlock'
import type { SoundEngine, createSoundEngine as CreateSoundEngine } from './engine'
import { getSoundSettings, isCategoryEnabled, onSoundSettingsChange } from './sound-settings'
import { SOUND_CATEGORY, type SoundRequest } from './sound-types'

let createEngine: typeof CreateSoundEngine | null = null
let loading: Promise<void> | null = null
let engine: SoundEngine | null = null

function volumeLevel(): number {
  return getSoundSettings().volume / 100
}

function hasAnySound(): boolean {
  const { isBoosterEnabled, isInterfaceEnabled } = getSoundSettings()
  return isBoosterEnabled || isInterfaceEnabled
}

/** Fetches the synth chunk ahead of time when any sound is enabled; never plays anything. */
export function preloadSound(): void {
  if (!hasAnySound()) return
  loading ??= import('./engine').then(
    (module) => {
      createEngine = module.createSoundEngine
    },
    (error: unknown) => {
      logger.warn('Sound engine failed to load', { error })
      loading = null
    },
  )
}

function readyEngine(): SoundEngine | null {
  const ctx = playableContext()
  if (!ctx || !createEngine) return null
  engine ??= createEngine(ctx, volumeLevel())
  return engine
}

function hapticPattern(request: SoundRequest): readonly number[] | null {
  if (request.name === 'packTap') return [12]
  if (request.name === 'burst') return [30, 40, 60]
  if (request.name === 'stamp' && request.level >= 4) return [20, 30, 20, 30, 80]
  return null
}

function vibrate(pattern: readonly number[]): void {
  if (typeof navigator.vibrate === 'function') navigator.vibrate([...pattern])
}

/**
 * Plays a sound when its category is enabled, `delay` seconds from now.
 * The sound is dropped, never queued, while the synth chunk is loading or the context is not running.
 */
export function playSound(request: SoundRequest, delay = 0): void {
  if (!isCategoryEnabled(SOUND_CATEGORY[request.name])) return
  const pattern = delay === 0 ? hapticPattern(request) : null
  if (pattern) vibrate(pattern)
  const ready = readyEngine()
  if (ready) ready.play(request, delay)
  else preloadSound()
}

/** Fades out and cuts every sound playing or scheduled. */
export function stopSounds(): void {
  engine?.stopAll()
}

/** Plays a short coin at the current volume; call it from a gesture handler. */
export function previewSound(): void {
  unlockAudioNow()
  const ready = readyEngine()
  if (ready) ready.play({ name: 'coin' }, 0)
  else preloadSound()
}

/**
 * Arms the gesture unlock, routes interface sounds from `lib/ui-sound`, keeps the volume in sync,
 * suspends audio when every category is off and starts loading the synth right away.
 */
export function installSound(): void {
  installAudioUnlock({
    isWanted: hasAnySound,
    onGesture: preloadSound,
    onRunning: (hasStalePlays) => {
      if (hasStalePlays) stopSounds()
    },
    onStopped: stopSounds,
  })
  setUiSoundHandler((name) => playSound({ name }))
  onSoundSettingsChange(() => {
    engine?.setVolume(volumeLevel())
    if (!hasAnySound()) suspendAudio()
  })
  preloadSound()
}
