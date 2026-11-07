import { useState } from 'react'
import { Button } from './button'
import { Notice } from './notice'

interface CopyButtonProps {
  value: string
  label: string
}

/** Copies a value to the clipboard, confirming or reporting failure in French. */
export function CopyButton({ value, label }: CopyButtonProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value)
      setStatus('copied')
    } catch {
      setStatus('failed')
    }
  }

  return (
    <>
      <Button variant="ghost" block onClick={() => void copy()}>
        {status === 'copied' ? 'Copié !' : label}
      </Button>
      {status === 'failed' ? (
        <Notice tone="error">Copie impossible, sélectionne le texte à la main.</Notice>
      ) : null}
    </>
  )
}
