import type { Database, SeriesRecord } from '@storix/db'
import { eventEndPayload, eventStartPayload, type PushPayload } from '@storix/shared'
import type { WorkerLogger } from '../../lib/logger'
import type { PushSender, PushTarget } from '../../lib/push-sender.types'
import {
  claimEventEnd,
  claimEventStart,
  deletePushSubscription,
  listEventPushTargets,
  listSeriesContributors,
  listUnannouncedStarts,
} from './series-push.repository'

const SEND_CHUNK = 10
/** An event is announced once it has been live this long, so one ended right away never pushes. */
export const EVENT_START_PUSH_DELAY_MS = 60_000
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

function chunks<T>(items: readonly T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size),
  )
}

/** Creates the event pushes: one at the start for the whole league, one at the close for the contributors. */
export function createSeriesPushService({ db, sender, clock, logger }: Deps): SeriesPushService {
  async function sendAll(targets: readonly PushTarget[], payload: PushPayload): Promise<number> {
    if (sender === null) return 0
    let sent = 0
    for (const batch of chunks(targets, SEND_CHUNK)) {
      const results = await Promise.all(batch.map((target) => sender.send(target, payload)))
      for (const [index, result] of results.entries()) {
        if (result === 'sent') sent += 1
        const target = batch[index]
        if (target !== undefined && (result === 'gone' || result === 'refused')) {
          await deletePushSubscription(db, target.endpoint)
        }
      }
    }
    return sent
  }

  async function announceStart(series: SeriesRecord, now: Date): Promise<boolean> {
    const isOver = series.endsAt <= now
    const isTooFresh = now.getTime() - series.startsAt.getTime() < EVENT_START_PUSH_DELAY_MS
    if (isTooFresh && !isOver) return false
    if (isOver) {
      await claimEventStart(db, { seriesId: series.id, now })
      return false
    }
    const payload = eventStartPayload(series)
    if (!(await claimEventStart(db, { seriesId: series.id, now }))) return false
    const targets = await listEventPushTargets(db, { leagueId: series.leagueId })
    const sent = await sendAll(targets, payload)
    logger.info({ seriesId: series.id, sent }, 'Event start announced')
    return true
  }

  return {
    async notifyStarts() {
      const now = clock()
      let announced = 0
      for (const series of await listUnannouncedStarts(db, now)) {
        try {
          if (await announceStart(series, now)) announced += 1
        } catch (error) {
          logger.error({ err: error, seriesId: series.id }, 'Event start push failed')
        }
      }
      return announced
    },

    async notifyEnd(series) {
      if (series.kind !== 'event') return
      try {
        const contributors = await listSeriesContributors(db, series.id)
        const cardCount = contributors.reduce((sum, row) => sum + row.cards, 0)
        if (cardCount === 0) return
        const payload = eventEndPayload(series, cardCount)
        if (!(await claimEventEnd(db, { seriesId: series.id, now: clock() }))) return
        const userIds = contributors.map((row) => row.userId)
        const targets = await listEventPushTargets(db, { leagueId: series.leagueId, userIds })
        const sent = await sendAll(targets, payload)
        logger.info({ seriesId: series.id, sent }, 'Event end announced')
      } catch (error) {
        logger.error({ err: error, seriesId: series.id }, 'Event end push failed')
      }
    },
  }
}
