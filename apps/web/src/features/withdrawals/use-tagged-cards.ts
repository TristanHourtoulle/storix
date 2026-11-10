import { useEffect, useState } from 'react'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { TaggedCard } from '@storix/shared'
import { readStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage'
import { taggedCardsQueryOptions } from './withdrawals.queries'

const LEGACY_TAG_DATE = '2000-01-01T00:00:00.000Z'

function newestTagDate(cards: readonly TaggedCard[]): string | null {
  return cards.reduce<string | null>(
    (newest, card) => (newest === null || card.taggedAt > newest ? card.taggedAt : newest),
    null,
  )
}

/** Returns the cards the caller appears on. */
export function useTaggedCards(leagueId: string): UseQueryResult<TaggedCard[]> {
  return useQuery(taggedCardsQueryOptions(leagueId))
}

/**
 * True when the caller was tagged after their last visit of "Photos où tu apparais" on this device.
 * Tags older than the wave 2 launch carry the legacy date and never light the dot.
 */
export function useHasNewTag(userId: string, leagueId: string): boolean {
  const { data } = useTaggedCards(leagueId)
  const newest = data ? newestTagDate(data) : null
  const [seen] = useState(() => readStorage(STORAGE_KEYS.taggedSeen(userId, leagueId)))
  return newest !== null && newest > (seen ?? LEGACY_TAG_DATE)
}

/** Remembers the newest tag as seen once the tagged cards are shown. */
export function useMarkTagsSeen(userId: string, leagueId: string, cards: TaggedCard[] | undefined) {
  useEffect(() => {
    const newest = cards ? newestTagDate(cards) : null
    if (newest !== null) writeStorage(STORAGE_KEYS.taggedSeen(userId, leagueId), newest)
  }, [userId, leagueId, cards])
}
