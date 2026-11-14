import type { Database, SeriesRecord } from '@storix/db'
import { boosterFullPushPayloadSchema } from '@storix/shared'
import type { WorkerLogger } from '../../lib/logger'
import type { PushSender, PushTarget } from '../../lib/push-sender.types'
import {
  claimEventEnd,
  claimEventStarts,
  deletePushSubscription,
  listEventPushTargets,
  listSeriesContributors,
} from './series-push.repository'

const NOTIFICATION_TITLE = 'Storix'
const PARIS_TIME = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  hour: 'numeric',
  minute: '2-digit',
})

export interface SeriesPushService {
  notifyStarts(): Promise<number>
  notifyEnd(series: SeriesRecord): Promise<void>
}

interface Deps {
  db: Database
  /** Null when VAPID keys are missing: starts are still claimed so a later run does not push stale ones. */
  sender: PushSender | null
  clock: () => Date
  logger: WorkerLogger
}

/** « La Soirée de Léa commence ! Les photos d'ici 2:00 vont dans sa série. » */
export function eventStartBody(series: Pick<SeriesRecord, 'title' | 'endsAt'>): string {
  return `${series.title} commence ! Les photos d'ici ${PARIS_TIME.format(series.endsAt)} vont dans sa série.`
}

/** « Soirée de Léa, c'est fini : 23 cartes à trouver dans les boosters. » */
export function eventEndBody(title: string, cardCount: number): string {
  const cards = `${cardCount} carte${cardCount > 1 ? 's' : ''}`
  return `${title}, c'est fini : ${cards} à trouver dans les boosters.`
}

/** Creates the event pushes: one at the start for the whole league, one at the close for the contributors. */
export function createSeriesPushService({ db, sender, clock, logger }: Deps): SeriesPushService {
  async function sendAll(
    targets: readonly PushTarget[],
    message: { body: string; url: string; tag: string },
  ): Promise<number> {
    if (sender === null) return 0
    const payload = boosterFullPushPayloadSchema.parse({
      v: 1,
      title: NOTIFICATION_TITLE,
      ...message,
    })
    let sent = 0
    for (const target of targets) {
      const result = await sender.send(target, payload)
      if (result === 'sent') sent += 1
      if (result === 'gone' || result === 'refused')
        await deletePushSubscription(db, target.endpoint)
    }
    return sent
  }

  return {
    async notifyStarts() {
      const now = clock()
      const started = await claimEventStarts(db, now)
      let announced = 0
      for (const series of started) {
        if (series.endsAt <= now) continue
        try {
          const targets = await listEventPushTargets(db, { leagueId: series.leagueId })
          const sent = await sendAll(targets, {
            body: eventStartBody(series),
            url: `/l/${series.leagueId}`,
            tag: `event:${series.id}`,
          })
          announced += 1
          logger.info({ seriesId: series.id, sent }, 'Event start announced')
        } catch (error) {
          logger.warn({ err: error, seriesId: series.id }, 'Event start push failed')
        }
      }
      return announced
    },

    async notifyEnd(series) {
      if (series.kind !== 'event') return
      const contributors = await listSeriesContributors(db, series.id)
      const cardCount = contributors.reduce((sum, row) => sum + row.cards, 0)
      if (cardCount === 0) return
      if (!(await claimEventEnd(db, { seriesId: series.id, now: clock() }))) return
      const userIds = contributors.map((row) => row.userId)
      const targets = await listEventPushTargets(db, { leagueId: series.leagueId, userIds })
      const sent = await sendAll(targets, {
        body: eventEndBody(series.title, cardCount),
        url: `/l/${series.leagueId}/series/${series.id}`,
        tag: `event-end:${series.id}`,
      })
      logger.info({ seriesId: series.id, sent }, 'Event end announced')
    },
  }
}
