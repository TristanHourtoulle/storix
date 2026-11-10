import { useSyncExternalStore } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallPromptOutcome = 'accepted' | 'dismissed' | 'unavailable'

let deferred: BeforeInstallPromptEvent | null = null
let isCapturing = false
const listeners = new Set<() => void>()

function setDeferred(next: BeforeInstallPromptEvent | null): void {
  deferred = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const hasDeferred = (): boolean => deferred !== null

/** Starts listening for the browser install prompt; call once before the first render. */
export function startInstallPromptCapture(): void {
  if (isCapturing) return
  isCapturing = true
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    setDeferred(event as BeforeInstallPromptEvent)
  })
  window.addEventListener('appinstalled', () => setDeferred(null))
}

async function promptInstall(): Promise<InstallPromptOutcome> {
  const event = deferred
  if (event === null) return 'unavailable'
  setDeferred(null)
  await event.prompt()
  const { outcome } = await event.userChoice
  return outcome
}

/** Exposes whether a captured install prompt can be shown, and a function to show it. */
export function useInstallPrompt(): {
  canPrompt: boolean
  prompt: () => Promise<InstallPromptOutcome>
} {
  const canPrompt = useSyncExternalStore(subscribe, hasDeferred, () => false)
  return { canPrompt, prompt: promptInstall }
}
