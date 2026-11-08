import { useEffect, useRef } from 'react'
import { playSound } from '@/features/sound/sound'

const READY_AFTER_COUNTDOWN_MS = 15_000

function isForeground(): boolean {
  return document.visibilityState === 'visible'
}

/**
 * Chimes while the home screen is in the foreground: once when the countdown reaches zero,
 * then when the stock grows unless that countdown chime just played.
 */
export function useBoosterReadySound(stock: number, remainingMs: number | null): void {
  const previousStockRef = useRef(stock)
  const previousRemainingRef = useRef(remainingMs)
  const countdownAtRef = useRef(0)

  useEffect(() => {
    const previous = previousRemainingRef.current
    previousRemainingRef.current = remainingMs
    if (remainingMs !== 0 || previous === null || previous === 0 || !isForeground()) return
    countdownAtRef.current = Date.now()
    playSound({ name: 'countdownEnd' })
  }, [remainingMs])

  useEffect(() => {
    const previous = previousStockRef.current
    previousStockRef.current = stock
    if (stock <= previous || !isForeground()) return
    if (Date.now() - countdownAtRef.current < READY_AFTER_COUNTDOWN_MS) return
    playSound({ name: 'boosterReady' })
  }, [stock])
}
