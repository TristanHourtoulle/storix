import { useCallback, useEffect, useRef } from 'react'
import { useBlocker, type ShouldBlockFn } from '@tanstack/react-router'
import { isLeavingRoute } from '../use-leave-guard'

export interface ShotLeaveGuard {
  isOpen: boolean
  stay: () => void
  leave: () => void
}

const NOOP = (): void => undefined

/** Holds route exits while unsent shots are in the strip (C12). */
export function useShotLeaveGuard(hasShots: boolean): ShotLeaveGuard {
  const hasShotsRef = useRef(hasShots)

  useEffect(() => {
    hasShotsRef.current = hasShots
  }, [hasShots])

  const shouldBlockFn = useCallback<ShouldBlockFn>(
    ({ current, next }) => hasShotsRef.current && isLeavingRoute(current, next),
    [],
  )
  const enableBeforeUnload = useCallback((): boolean => hasShotsRef.current, [])
  const blocker = useBlocker({ shouldBlockFn, withResolver: true, enableBeforeUnload })

  return blocker.status === 'blocked'
    ? { isOpen: true, stay: blocker.reset, leave: blocker.proceed }
    : { isOpen: false, stay: NOOP, leave: NOOP }
}
