import { useCallback, useState } from 'react'
import { isIosSafari, isStandalone } from '@/lib/platform'
import { STORAGE_KEYS, readStorage, writeStorage } from '@/lib/storage'

function shouldShowHint(): boolean {
  return isIosSafari() && !isStandalone() && readStorage(STORAGE_KEYS.iosHintDismissed) === null
}

/** Controls the visibility of the iOS "add to home screen" hint. */
export function useIosInstallHint(): { isVisible: boolean; dismiss: () => void } {
  const [isVisible, setIsVisible] = useState(shouldShowHint)

  const dismiss = useCallback(() => {
    writeStorage(STORAGE_KEYS.iosHintDismissed, '1')
    setIsVisible(false)
  }, [])

  return { isVisible, dismiss }
}
