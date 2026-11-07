import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/ui/copy-button'
import { Notice } from '@/components/ui/notice'

interface InvitationLinkProps {
  url: string
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function InvitationLink({ url }: InvitationLinkProps) {
  const [shareFailed, setShareFailed] = useState(false)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function share(): Promise<void> {
    try {
      await navigator.share({ url })
      setShareFailed(false)
    } catch (error) {
      if (!isAbort(error)) setShareFailed(true)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-input bg-surface p-3 shadow-hairline">
      <output
        aria-label="Lien d'invitation"
        className="block break-all rounded-thumb bg-bg p-3 font-mono text-[13px] text-ink-2"
      >
        {url}
      </output>
      <div className="flex flex-col gap-2">
        <CopyButton value={url} label="Copier le lien" />
        {canShare ? (
          <Button variant="ghost" block onClick={() => void share()}>
            Partager
          </Button>
        ) : null}
      </div>
      {shareFailed ? (
        <Notice tone="error">Partage impossible, copie le lien à la place.</Notice>
      ) : null}
      <Notice tone="info">Ce lien ne sera plus affiché : copie-le maintenant.</Notice>
    </div>
  )
}
