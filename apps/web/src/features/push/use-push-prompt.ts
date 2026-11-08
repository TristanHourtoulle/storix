import { useCallback, useState } from 'react'
import { STORAGE_KEYS, readStorage, writeStorage } from '@/lib/storage'
import type { PushStatus } from './push-status'

/** Decides whether to offer notifications once on this device. */
export function usePushPrompt(
  status: PushStatus,
  isReady: boolean,
): { isVisible: boolean; dismiss: () => void } {
  const [isDismissed, setIsDismissed] = useState(
    () => readStorage(STORAGE_KEYS.pushPromptDismissed) !== null,
  )

  const dismiss = useCallback(() => {
    writeStorage(STORAGE_KEYS.pushPromptDismissed, '1')
    setIsDismissed(true)
  }, [])

  return { isVisible: isReady && status === 'disabled' && !isDismissed, dismiss }
}
