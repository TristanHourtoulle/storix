import { logger } from '@/lib/logger'

const GESTURE_EVENTS = ['pointerdown', 'touchend', 'keydown', 'click'] as const
const PENDING_GRACE_MS = 250
const STALE_PENDING_MS = 1500

interface WindowWithWebkitAudio {
  webkitAudioContext?: typeof AudioContext
}

interface AudioUnlockOptions {
  isWanted: () => boolean
  onGesture: () => void
  onRunning: (hasStalePlays: boolean) => void
  onStopped: () => void
}

let ctx: AudioContext | null = null
let resumeRequestedAt = Number.NEGATIVE_INFINITY
let firstPendingPlayAt: number | null = null
let isArmed = false
let options: AudioUnlockOptions | null = null

function setAmbientSession(): void {
  const session: unknown = Reflect.get(navigator, 'audioSession')
  if (typeof session !== 'object' || session === null || !('type' in session)) return
  try {
    Reflect.set(session, 'type', 'ambient')
  } catch (error) {
    logger.debug('Ambient audio session unavailable', { error })
  }
}

function createContext(): AudioContext | null {
  const AudioContextClass =
    window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext
  if (!AudioContextClass) return null
  setAmbientSession()
  const created = new AudioContextClass()
  created.addEventListener('statechange', handleStateChange)
  return created
}

function handleStateChange(): void {
  if (!ctx) return
  if (ctx.state === 'running') {
    const isStale =
      firstPendingPlayAt !== null && performance.now() - firstPendingPlayAt > STALE_PENDING_MS
    firstPendingPlayAt = null
    disarm()
    options?.onRunning(isStale)
    return
  }
  firstPendingPlayAt = null
  options?.onStopped()
  arm()
}

function playSilentSample(context: AudioContext): void {
  const source = context.createBufferSource()
  source.buffer = context.createBuffer(1, 1, context.sampleRate)
  source.connect(context.destination)
  source.start(0)
}

function handleGesture(): void {
  if (!options?.isWanted()) return
  options.onGesture()
  ctx ??= createContext()
  if (!ctx || ctx.state === 'running') return
  resumeRequestedAt = performance.now()
  ctx.resume().catch((error: unknown) => logger.debug('Audio resume refused', { error }))
  playSilentSample(ctx)
}

function arm(): void {
  if (isArmed) return
  isArmed = true
  GESTURE_EVENTS.forEach((type) =>
    window.addEventListener(type, handleGesture, { capture: true, passive: true }),
  )
}

function disarm(): void {
  if (!isArmed) return
  isArmed = false
  GESTURE_EVENTS.forEach((type) => window.removeEventListener(type, handleGesture, true))
}

/**
 * Installs the gesture unlock: inside each pointerdown, touchend, keydown or click it creates the
 * AudioContext, resumes it and starts a silent sample synchronously. Listeners are re-armed whenever
 * the context leaves the running state (suspension, iOS interruption, backgrounding).
 */
export function installAudioUnlock(next: AudioUnlockOptions): void {
  options = next
  arm()
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return
    if (document.visibilityState === 'hidden') {
      void ctx.suspend()
      return
    }
    if (options?.isWanted()) {
      ctx.resume().catch((error: unknown) => logger.debug('Audio resume refused', { error }))
    }
  })
}

/** Unlocks from inside a gesture handler the app controls (same work as the global listeners). */
export function unlockAudioNow(): void {
  handleGesture()
}

/** Suspends the context, e.g. when every sound category is switched off. */
export function suspendAudio(): void {
  if (ctx?.state === 'running') void ctx.suspend()
}

/**
 * Returns the context when a sound may be scheduled now: running, or resumed by a gesture a moment
 * ago and about to start. Returns null otherwise, so callers drop the sound instead of queueing it.
 */
export function playableContext(): AudioContext | null {
  if (!ctx) return null
  if (ctx.state === 'running') return ctx
  const isStarting =
    ctx.state === 'suspended' && performance.now() - resumeRequestedAt < PENDING_GRACE_MS
  if (!isStarting) return null
  firstPendingPlayAt ??= performance.now()
  return ctx
}
