import { logger } from '@/lib/logger'
import type { SoundEngine } from './engine'
import { getSoundSettings, isCategoryEnabled, onSoundSettingsChange } from './sound-settings'
import { SOUND_CATEGORY, type SoundRequest } from './sound-types'

const GESTURE_EVENTS = ['pointerdown', 'touchend', 'keydown', 'click'] as const
const IDLE_PRELOAD_MS = 1500

let engine: SoundEngine | null = null
let loading: Promise<SoundEngine | null> | null = null
let isUnlocked = false

function volumeLevel(): number {
  return getSoundSettings().volume / 100
}

function hasAnySound(): boolean {
  const { isBoosterEnabled, isInterfaceEnabled } = getSoundSettings()
  return isBoosterEnabled || isInterfaceEnabled
}

/** Loads the synth chunk ahead of the first tap so unlocking never waits on the network. */
export function preloadSound(): Promise<SoundEngine | null> {
  loading ??= import('./engine').then(
    ({ createSoundEngine }) => {
      engine = createSoundEngine(volumeLevel())
      return engine
    },
    (error: unknown) => {
      logger.warn('Sound engine failed to load', { error })
      loading = null
      return null
    },
  )
  return loading
}

function hapticPattern(request: SoundRequest): readonly number[] | null {
  if (request.name === 'packTap') return [12]
  if (request.name === 'burst') return [30, 40, 60]
  if (request.name === 'stamp' && request.level >= 4) return [20, 30, 20, 30, 80]
  return null
}

function vibrate(pattern: readonly number[], delay: number): void {
  if (typeof navigator.vibrate !== 'function') return
  const run = () => navigator.vibrate([...pattern])
  if (delay > 0) setTimeout(run, delay * 1000)
  else run()
}

/**
 * Plays a sound when its category is enabled, `delay` seconds from now.
 * Does nothing (not even loading the synth) when the category is off.
 */
export function playSound(request: SoundRequest, delay = 0): void {
  if (!isCategoryEnabled(SOUND_CATEGORY[request.name])) return
  const pattern = hapticPattern(request)
  if (pattern) vibrate(pattern, delay)
  if (engine) {
    engine.play(request, delay)
    return
  }
  void preloadSound().then((loaded) => loaded?.play(request, delay))
}

/** Fades out and cuts every sound playing or scheduled. */
export function stopSounds(): void {
  engine?.stopAll()
}

/** Plays a short coin at the current volume, whatever the category settings. */
export function previewSound(): void {
  void preloadSound().then((loaded) => {
    void loaded?.unlock()
    loaded?.play({ name: 'coin' }, 0)
  })
}

function removeGestureListeners(): void {
  GESTURE_EVENTS.forEach((type) => window.removeEventListener(type, handleGesture, true))
}

function handleGesture(): void {
  if (isUnlocked || !hasAnySound()) return
  if (!engine) {
    void preloadSound()
    return
  }
  void engine.unlock().then((isRunning) => {
    if (!isRunning || isUnlocked) return
    isUnlocked = true
    removeGestureListeners()
  })
}

/**
 * Unlocks the AudioContext synchronously inside the first real gesture (touch, pen, mouse or key),
 * keeps the device volume in sync and preloads the synth once the app is idle.
 */
export function installSound(): void {
  GESTURE_EVENTS.forEach((type) =>
    window.addEventListener(type, handleGesture, { capture: true, passive: true }),
  )
  onSoundSettingsChange(() => engine?.setVolume(volumeLevel()))
  setTimeout(() => {
    if (hasAnySound()) void preloadSound()
  }, IDLE_PRELOAD_MS)
}
