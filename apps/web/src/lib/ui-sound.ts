export type UiSound = 'tap' | 'confirm' | 'error' | 'destructive'

type UiSoundHandler = (sound: UiSound) => void

let handler: UiSoundHandler | null = null

/** Registers the app-wide player for interface feedback sounds (one at a time). */
export function setUiSoundHandler(next: UiSoundHandler | null): void {
  handler = next
}

/** Emits an interface feedback sound; a no-op until a player is registered. */
export function emitUiSound(sound: UiSound): void {
  handler?.(sound)
}
