import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Notice } from '@/components/ui/notice'
import { usePasskeyPrompt } from '../use-passkey-prompt'
import { defaultPasskeyName } from '../use-passkeys'

interface PasskeyPromptProps {
  userId: string
  displayUsername: string
}

export function PasskeyPrompt({ userId, displayUsername }: PasskeyPromptProps) {
  const { isOpen, dismiss, addPasskey } = usePasskeyPrompt(userId)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleAdd(): Promise<void> {
    setError(null)
    setIsPending(true)
    try {
      await addPasskey(defaultPasskeyName(displayUsername))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible d'ajouter la passkey.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={isOpen} title="Connecte-toi plus vite" onClose={dismiss}>
      <p className="m-0 text-sm leading-snug text-muted">
        Ajoute une passkey : Face ID, Touch ID ou le code de ton téléphone suffiront.
      </p>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex flex-col gap-2">
        <Button variant="primary" block isLoading={isPending} onClick={handleAdd}>
          Ajouter une passkey
        </Button>
        <Button variant="ghost" block onClick={dismiss}>
          Plus tard
        </Button>
      </div>
    </Dialog>
  )
}
