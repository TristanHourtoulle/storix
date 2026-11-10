import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { logger } from '@/lib/logger'

const COPIED_MS = 2000

interface CopyLink {
  isCopied: boolean
  needsManualCopy: boolean
  copy: () => void
  fallbackRef: RefObject<HTMLInputElement | null>
}

/**
 * Copies `url` to the clipboard. When the clipboard is blocked, selects it in a read-only input
 * and tries a legacy copy, flagging `needsManualCopy` if that fails too.
 */
export function useCopyLink(url: string): CopyLink {
  const [isCopied, setIsCopied] = useState(false)
  const [needsManualCopy, setNeedsManualCopy] = useState(false)
  const fallbackRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isCopied) return
    const timer = window.setTimeout(() => setIsCopied(false), COPIED_MS)
    return () => window.clearTimeout(timer)
  }, [isCopied])

  const selectFallback = useCallback(() => {
    const input = fallbackRef.current
    if (input === null) {
      setNeedsManualCopy(true)
      return
    }
    input.focus()
    input.select()
    input.setSelectionRange(0, url.length)
    if (document.execCommand('copy')) {
      setIsCopied(true)
      return
    }
    setNeedsManualCopy(true)
  }, [url])

  const copy = useCallback(() => {
    if (navigator.clipboard === undefined) {
      selectFallback()
      return
    }
    navigator.clipboard
      .writeText(url)
      .then(() => setIsCopied(true))
      .catch((error: unknown) => {
        logger.warn('Copying the app link failed', { error })
        selectFallback()
      })
  }, [selectFallback, url])

  return { isCopied, needsManualCopy, copy, fallbackRef }
}
