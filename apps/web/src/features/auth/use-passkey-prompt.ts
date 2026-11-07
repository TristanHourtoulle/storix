import { useCallback, useState } from 'react'
import { STORAGE_KEYS, readStorage, writeStorage } from '@/lib/storage'
import { usePasskeys } from './use-passkeys'

function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && window.PublicKeyCredential !== undefined
}

/** Decides whether to invite the user to add a passkey on this device. */
export function usePasskeyPrompt(userId: string): {
  isOpen: boolean
  dismiss: () => void
  addPasskey: (name: string) => Promise<void>
} {
  const key = STORAGE_KEYS.passkeyPromptDismissed(userId)
  const [isDismissed, setIsDismissed] = useState(() => readStorage(key) !== null)
  const { passkeys, addPasskey, isReady } = usePasskeys()

  const dismiss = useCallback(() => {
    writeStorage(key, '1')
    setIsDismissed(true)
  }, [key])

  const add = useCallback(
    async (name: string): Promise<void> => {
      await addPasskey(name)
      dismiss()
    },
    [addPasskey, dismiss],
  )

  const isOpen = !isDismissed && isWebAuthnSupported() && isReady && passkeys.length === 0
  return { isOpen, dismiss, addPasskey: add }
}
