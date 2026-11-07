import { useEffect } from 'react'
import { STORAGE_KEYS, readStorage, removeStorage, writeStorage } from '@/lib/storage'

/** Last league opened by the user on this device, or null. */
export function readLastLeagueId(userId: string): string | null {
  return readStorage(STORAGE_KEYS.lastLeagueId(userId))
}

/** Forgets the last league opened by the user on this device. */
export function clearLastLeagueId(userId: string): void {
  removeStorage(STORAGE_KEYS.lastLeagueId(userId))
}

/** Remembers the league actually displayed so the home screen reopens it. */
export function useRememberLastLeague(userId: string, leagueId: string): void {
  useEffect(() => {
    writeStorage(STORAGE_KEYS.lastLeagueId(userId), leagueId)
  }, [userId, leagueId])
}
