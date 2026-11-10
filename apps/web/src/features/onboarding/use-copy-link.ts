import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { logger } from '@/lib/logger'

const COPIED_MS = 2000

interface CopyLink {
  isCopied: boolean
  copy: () => void
  fallbackRef: RefObject<HTMLInputElement | null>
}

/** Copies `url` to the clipboard, or selects it in a read-only input when the clipboard is blocked. */
export function useCopyLink(url: string): CopyLink {
  const [isCopied, setIsCopied] = useState(false)
  const fallbackRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isCopied) return
    const timer = window.setTimeout(() => setIsCopied(false), COPIED_MS)
    return () => window.clearTimeout(timer)
  }, [isCopied])

  const selectFallback = useCallback(() => {
    fallbackRef.current?.focus()
    fallbackRef.current?.select()
  }, [])

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

  return { isCopied, copy, fallbackRef }
}
