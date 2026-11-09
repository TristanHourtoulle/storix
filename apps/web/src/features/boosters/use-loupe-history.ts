import { useCallback } from 'react'
import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router'

declare module '@tanstack/react-router' {
  interface HistoryState {
    storixLoupe?: true
  }
}

interface LoupeHistory {
  isInHistory: boolean
  push: () => void
  pop: () => void
}

/** Ties the recap loupe to one history entry, so the phone back button closes it. */
export function useLoupeHistory(): LoupeHistory {
  const router = useRouter()
  const navigate = useNavigate()
  const isInHistory = useRouterState({ select: (state) => state.location.state.storixLoupe === true })

  const push = useCallback((): void => {
    if (router.state.location.state.storixLoupe === true) return
    void navigate({
      to: '.',
      search: true,
      params: true,
      state: (previous) => ({ ...previous, storixLoupe: true }),
      resetScroll: false,
    })
  }, [navigate, router])

  const pop = useCallback((): void => {
    if (router.history.location.state.storixLoupe !== true) return
    router.history.back()
  }, [router])

  return { isInHistory, push, pop }
}
