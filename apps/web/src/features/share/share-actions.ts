import { logger } from '@/lib/logger'

export type ShareOutcome = 'shared' | 'cancelled' | 'failed'

function outcomeOf(error: unknown): ShareOutcome {
  if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
  logger.warn('Share failed', { error })
  return 'failed'
}

/** True when this browser can hand the file to the system share sheet. */
export function canShareFiles(file: File): boolean {
  return typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] }) === true
}

/** Opens the system share sheet; `navigator.share` runs synchronously so it stays inside the tap. */
export function shareFile(file: File, text: string | null): Promise<ShareOutcome> {
  const data: ShareData = text === null ? { files: [file] } : { files: [file], text }
  try {
    return navigator.share(data).then(() => 'shared' as const, outcomeOf)
  } catch (error) {
    return Promise.resolve(outcomeOf(error))
  }
}

/** Saves an image through a temporary `<a download>`. */
export function downloadImage(url: string, fileName: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
}

/** Copies the share text; resolves false when the clipboard refuses. */
export async function copyShareText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    logger.warn('Clipboard write failed', { error })
    return false
  }
}

/** True on a mouse or trackpad (desktop), where a download is the natural way to save. */
export function hasFinePointer(): boolean {
  return window.matchMedia('(pointer: fine)').matches
}
