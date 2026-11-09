import { logger } from '@/lib/logger'

const FIRST_FRAME_TIMEOUT_MS = 3000

/** Resolves on the next animation frame. */
export function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

/** Resolves after `ms` milliseconds. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

/** Resolves true on the first decoded frame, false after 3 s without one. */
export function waitForFirstFrame(video: HTMLVideoElement): Promise<boolean> {
  return new Promise((resolve) => {
    let isDone = false
    const onPlaying = (): void => {
      if (video.videoWidth > 0) finish(true)
    }
    const finish = (hasFrame: boolean): void => {
      if (isDone) return
      isDone = true
      window.clearTimeout(timer)
      video.removeEventListener('playing', onPlaying)
      resolve(hasFrame)
    }
    const timer = window.setTimeout(() => finish(false), FIRST_FRAME_TIMEOUT_MS)
    if (typeof Reflect.get(video, 'requestVideoFrameCallback') === 'function') {
      video.requestVideoFrameCallback(() => finish(true))
    } else {
      video.addEventListener('playing', onPlaying)
      onPlaying()
    }
  })
}

/** Shows the stream in the video element and starts playback, ignoring an interrupted play(). */
export function attachStream(video: HTMLVideoElement, stream: MediaStream): void {
  video.srcObject = stream
  video.play().catch((error: unknown) => {
    if (error instanceof DOMException && error.name === 'AbortError') return
    logger.warn('Camera preview could not play', {
      name: error instanceof Error ? error.name : 'UnknownError',
    })
  })
}

/** The current hardware zoom of a track, when the browser reports one. */
export function settingsZoom(settings: MediaTrackSettings): number | null {
  const value: unknown = Reflect.get(settings, 'zoom')
  return typeof value === 'number' ? value : null
}
