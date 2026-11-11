import type { Database } from '@storix/db'
import {
  boosterFullPushPayloadSchema,
  isMomentWindowOpen,
  momentSlot,
  parisDayKey,
} from '@storix/shared'
import type { WorkerLogger } from '../../lib/logger'
import type { PushSender } from '../../lib/push-sender.types'
import * as repository from './moments.repository'

const NOTIFICATION_TITLE = 'Storix'

export interface MomentsTickService {
  tick(signal?: AbortSignal): Promise<void>
}

interface Deps {
  db: Database
  sender: PushSender
  clock: () => Date
  logger: WorkerLogger
}

/** Builds the French push body announcing a league's Moment. */
export function momentNotificationBody(leagueName: string): string {
  return `C'est le Moment ⚡ 2 min pour montrer ce que tu fais à ${leagueName}.`
}

/**
 * Creates the use case run every minute: claims each league's Moment once it fired today and, while its
 * 2-minute window is still open, pushes it to every member device. A Moment missed by a stopped worker is
 * recorded without a push, since its window is over.
 */
export function createMomentsTickService(deps: Deps): MomentsTickService {
  const { db, sender, clock, logger } = deps

  async function notify(league: repository.MomentLeague): Promise<number> {
    const payload = boosterFullPushPayloadSchema.parse({
      v: 1,
      title: NOTIFICATION_TITLE,
      body: momentNotificationBody(league.name),
      url: `/l/${league.id}`,
      tag: `moment:${league.id}`,
    })
    const targets = await repository.listLeaguePushTargets(db, league.id)
    let sent = 0
    for (const target of targets) {
      const result = await sender.send(target, payload)
      if (result === 'sent') sent += 1
      if (result === 'gone' || result === 'refused') {
        await repository.deletePushSubscription(db, target.endpoint)
      }
    }
    return sent
  }

  return {
    async tick(signal) {
      const now = clock()
      const day = parisDayKey(now)
      for (const league of await repository.listLeagues(db)) {
        if (signal?.aborted) {
          logger.warn('Moments tick stopped: job expired')
          return
        }
        const slot = momentSlot(league.id, day)
        if (slot.firesAt.getTime() > now.getTime()) continue
        const isOpen = isMomentWindowOpen(slot, now)
        try {
          const isClaimed = await repository.claimMoment(db, {
            leagueId: league.id,
            day,
            firesAt: slot.firesAt,
            notifiedAt: isOpen ? now : null,
          })
          if (!isClaimed || !isOpen) continue
          const sent = await notify(league)
          logger.info({ leagueId: league.id, sent }, 'Moment fired')
        } catch (error) {
          logger.error(
            { leagueId: league.id, name: error instanceof Error ? error.name : undefined },
            'Moment notification failed',
          )
        }
      }
    },
  }
}
