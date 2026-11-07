import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { RemovedCard } from '@storix/shared'
import { STORAGE_KEYS, readStorage, writeStorage } from '@/lib/storage'
import { logger } from '@/lib/logger'
import { fetchRemovedCards } from './removals.api'
import { purgeLeagueApiEntries, purgeMediaPrefixes } from './purge-cache'

const MAX_PAGES = 50
const MAX_ACKNOWLEDGED = 200

interface RemovalSync {
  removed: readonly RemovedCard[]
}

interface RemovalNoticeState {
  count: number
  dust: number
}

function readAcknowledged(userId: string, leagueId: string): string[] {
  const raw = readStorage(STORAGE_KEYS.acknowledgedRemovals(userId, leagueId))
  if (raw === null) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : []
  } catch (error) {
    logger.warn('Acknowledged removals unreadable', { error })
    return []
  }
}

/** Syncs cards removed from a league, purges their cached media and exposes a compensation notice. */
export function useRemovedCardsSync(
  userId: string,
  leagueId: string,
): { notice: RemovalNoticeState | null; acknowledge: () => void } {
  const queryClient = useQueryClient()
  const queryKey = useMemo(() => ['leagues', leagueId, 'removed-cards'] as const, [leagueId])
  const [acknowledged, setAcknowledged] = useState<readonly string[]>(() =>
    readAcknowledged(userId, leagueId),
  )

  const { data } = useQuery({
    queryKey,
    refetchOnWindowFocus: true,
    staleTime: 60_000,
    queryFn: async (): Promise<RemovalSync> => {
      const cursorKey = STORAGE_KEYS.removalCursor(userId, leagueId)
      let since = readStorage(cursorKey) ?? undefined
      let after: string | undefined
      const fresh: RemovedCard[] = []
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const response = await fetchRemovedCards(leagueId, { since, after })
        fresh.push(...response.removed)
        since = response.cursor
        after = response.after ?? undefined
        if (!response.hasMore) break
      }
      if (fresh.length > 0) {
        await Promise.all([
          purgeMediaPrefixes(fresh.map((card) => card.mediaPrefix)),
          purgeLeagueApiEntries(leagueId),
        ])
        for (const card of fresh) {
          queryClient.removeQueries({
            queryKey: ['leagues', leagueId, 'cards', 'detail', card.cardId],
          })
        }
        for (const segment of ['cards', 'wallet', 'reveals', 'admin']) {
          void queryClient.invalidateQueries({ queryKey: ['leagues', leagueId, segment] })
        }
      }
      if (since !== undefined) writeStorage(cursorKey, since)
      const previous = queryClient.getQueryData<RemovalSync>(queryKey)?.removed ?? []
      const known = new Set(previous.map((card) => card.cardId))
      return { removed: [...previous, ...fresh.filter((card) => !known.has(card.cardId))] }
    },
  })

  const notice = useMemo((): RemovalNoticeState | null => {
    const seen = new Set(acknowledged)
    const pending = (data?.removed ?? []).filter(
      (card) => card.compensation > 0 && !seen.has(card.cardId),
    )
    if (pending.length === 0) return null
    return {
      count: pending.length,
      dust: pending.reduce((total, card) => total + card.compensation, 0),
    }
  }, [data, acknowledged])

  const acknowledge = useCallback((): void => {
    const ids = (data?.removed ?? []).map((card) => card.cardId)
    const next = [...new Set([...acknowledged, ...ids])].slice(-MAX_ACKNOWLEDGED)
    writeStorage(STORAGE_KEYS.acknowledgedRemovals(userId, leagueId), JSON.stringify(next))
    setAcknowledged(next)
  }, [data, acknowledged, userId, leagueId])

  return { notice, acknowledge }
}
