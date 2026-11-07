import type { Database } from '@storix/db'
import {
  MYTHIC_CAP,
  previewRarity,
  resolveLeagueSettings,
  type LeagueSettingsView,
  type RarityPreview,
  type RarityWeights,
  type UpdateLeagueSettingsBody,
} from '@storix/shared'
import type { JobQueue } from '../../jobs/job-queue'
import type { ErrorLogger } from '../../lib/error-logger'
import { runInTransaction } from '../../lib/transaction'
import { insertAuditEntry } from '../audit/audit.repository'
import { findLeagueSettings } from '../leagues/leagues.repository'
import type { Membership } from '../leagues/leagues.service'
import {
  countMythicPins,
  listRarityInputs,
  lockLeagueRarity,
  updateLeagueSettings,
} from './league-settings.repository'

export interface LeagueSettingsService {
  getSettings(m: Membership): Promise<LeagueSettingsView>
  updateSettings(m: Membership, body: UpdateLeagueSettingsBody): Promise<LeagueSettingsView>
  previewRarity(m: Membership, weights: RarityWeights): Promise<RarityPreview>
}

/** Builds the service reading and writing league settings and previewing rarity weights. */
export function createLeagueSettingsService(deps: {
  db: Database
  jobs: JobQueue
  clock: () => Date
  logger: ErrorLogger
}): LeagueSettingsService {
  const { db, jobs, clock, logger } = deps

  const view = async (m: Membership): Promise<LeagueSettingsView> => {
    const [raw, mythicCount] = await Promise.all([
      findLeagueSettings(db, m.leagueId),
      countMythicPins(db, m.leagueId),
    ])
    return { settings: resolveLeagueSettings(raw), mythicCount, mythicCap: MYTHIC_CAP }
  }

  return {
    getSettings: view,

    async updateSettings(m, body) {
      await runInTransaction(db, async (tx) => {
        await lockLeagueRarity(tx, m.leagueId)
        const from = resolveLeagueSettings(await findLeagueSettings(tx, m.leagueId))
        await updateLeagueSettings(tx, m.leagueId, body)
        await insertAuditEntry(tx, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId: null,
          action: 'league.settings_updated',
          metadata: { from, to: body },
        })
      })
      try {
        await jobs.enqueueRarityRecompute({ leagueId: m.leagueId })
      } catch (error) {
        logger.error({ err: error, leagueId: m.leagueId }, 'Failed to enqueue rarity recompute')
      }
      return view(m)
    },

    async previewRarity(m, weights) {
      const cards = await listRarityInputs(db, m.leagueId)
      return { ...previewRarity({ cards, weights, now: clock() }), total: cards.length }
    },
  }
}
