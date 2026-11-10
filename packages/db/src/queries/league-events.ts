import type { CardTier, LeagueEventPayload, LeagueEventType } from '@storix/shared'
import type { DbExecutor } from '../client'
import { leagueEvents } from '../schema/index'

export interface NewLeagueEvent {
  leagueId: string
  actorId: string | null
  type: LeagueEventType
  cardId?: string | null
  tier?: CardTier | null
  payload?: LeagueEventPayload
  dedupeKey: string
  visibleAt?: Date
}

/** Inserts league feed events, skipping any whose dedupe key already exists. No-op on an empty list. */
export async function insertLeagueEvents(
  db: DbExecutor,
  events: readonly NewLeagueEvent[],
): Promise<void> {
  if (events.length === 0) return
  await db
    .insert(leagueEvents)
    .values(
      events.map((event) => ({
        leagueId: event.leagueId,
        actorId: event.actorId,
        type: event.type,
        cardId: event.cardId ?? null,
        tier: event.tier ?? null,
        payload: event.payload ?? {},
        dedupeKey: event.dedupeKey,
        ...(event.visibleAt === undefined ? {} : { visibleAt: event.visibleAt }),
      })),
    )
    .onConflictDoNothing({ target: leagueEvents.dedupeKey })
}
