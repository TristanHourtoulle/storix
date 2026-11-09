import { useCallback, useEffect, useRef, useState } from 'react'
import { copyShareText } from './share-actions'

type CopyState = 'idle' | 'copied' | 'failed'

const FEEDBACK_MS = 2000
const LABELS: Readonly<Record<CopyState, string>> = {
  idle: 'Copier le texte',
  copied: 'Texte copié',
  failed: 'Copie impossible',
}

/** « Copier le texte » with a 2 s in-button confirmation (no toast: it would sit under the modal). */
export function useCopyText(text: string): { label: string; copy: () => void } {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )

  const copy = useCallback((): void => {
    void copyShareText(text).then((isCopied) => {
      if (timer.current !== null) window.clearTimeout(timer.current)
      setState(isCopied ? 'copied' : 'failed')
      timer.current = window.setTimeout(() => setState('idle'), FEEDBACK_MS)
    })
  }, [text])

  return { label: LABELS[state], copy }
}
