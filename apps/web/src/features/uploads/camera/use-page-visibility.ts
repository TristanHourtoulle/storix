import { useEffect, useRef } from 'react'

interface PageVisibilityHandlers {
  onHide: () => void
  onShow: () => void
}

/** Calls `onHide` on visibilitychange (hidden) and pagehide, and `onShow` on visible and pageshow. */
export function usePageVisibility(handlers: PageVisibilityHandlers): void {
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') handlersRef.current.onHide()
      else handlersRef.current.onShow()
    }
    const onPageHide = (): void => handlersRef.current.onHide()
    const onPageShow = (): void => handlersRef.current.onShow()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])
}
