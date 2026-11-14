import { useEffect, type Dispatch } from 'react'
import { precheckedEventIds, type SeriesSummary } from '@storix/shared'
import type { SessionAction, StackCard } from '@/features/uploads/session/session-reducer'

/** Once per photo, switches on exactly the open events whose window contains the time it was taken. */
export function useEventPrecheck(
  cards: readonly StackCard[],
  openSeries: readonly SeriesSummary[],
  dispatch: Dispatch<SessionAction>,
  isReady: boolean,
): void {
  useEffect(() => {
    if (!isReady) return
    const events = openSeries
      .filter((series) => series.kind === 'event')
      .map((series) => ({
        id: series.id,
        kind: series.kind,
        startsAt: new Date(series.startsAt),
        endsAt: new Date(series.endsAt),
      }))
    for (const card of cards) {
      if (card.isPrechecked || card.phase === 'preparing') continue
      const capturedAt = card.capturedAt === null ? new Date() : new Date(card.capturedAt)
      const matching = precheckedEventIds(events, capturedAt)
      const eventIds = new Set(events.map((event) => event.id))
      const kept = card.seriesIds.filter((id) => !eventIds.has(id))
      dispatch({
        type: 'prechecked',
        localId: card.localId,
        seriesIds: [...new Set([...kept, ...matching])],
      })
    }
  }, [cards, openSeries, dispatch, isReady])
}
