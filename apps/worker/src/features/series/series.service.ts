import {
  closeSeries,
  ensureThemeSeries,
  listDueSeries,
  listLeagueIds,
  listUnrewardedCompletions,
  rewardCompletion,
  type Database,
} from '@storix/db'
import { themeWeekKey } from '@storix/shared'
import type { WorkerLogger } from '../../lib/logger'

export interface SeriesService {
  tick(): Promise<{ closed: number; rewarded: number }>
  rollover(): Promise<{ closed: number; opened: number; rewarded: number }>
}

interface Deps {
  db: Database
  clock: () => Date
  logger: WorkerLogger
}

/** Creates the use cases closing due series with their recap, paying completed series and opening the weekly theme; idempotent. */
export function createSeriesService({ db, clock, logger }: Deps): SeriesService {
  async function each<T>(items: readonly T[], run: (item: T) => Promise<boolean>): Promise<number> {
    return items.reduce<Promise<number>>(async (pending, item) => {
      const done = await pending
      try {
        return (await run(item)) ? done + 1 : done
      } catch (error) {
        logger.warn({ err: error }, 'Series update failed')
        return done
      }
    }, Promise.resolve(0))
  }

  async function closeDue(now: Date): Promise<number> {
    const due = await listDueSeries(db, now)
    return each(due, (series) => db.transaction((tx) => closeSeries(tx, { series, now })))
  }

  async function payCompletions(now: Date): Promise<number> {
    const completions = await listUnrewardedCompletions(db)
    return each(completions, (completion) =>
      db.transaction((tx) => rewardCompletion(tx, { ...completion, now })),
    )
  }

  async function openThemes(now: Date): Promise<number> {
    const weekKey = themeWeekKey(now)
    const leagueIds = await listLeagueIds(db)
    return each(leagueIds, async (leagueId) => {
      await ensureThemeSeries(db, { leagueId, weekKey })
      return true
    })
  }

  return {
    async tick() {
      const now = clock()
      const closed = await closeDue(now)
      const rewarded = await payCompletions(now)
      if (closed > 0 || rewarded > 0) logger.info({ closed, rewarded }, 'Series ticked')
      return { closed, rewarded }
    },

    async rollover() {
      const now = clock()
      const closed = await closeDue(now)
      const opened = await openThemes(now)
      const rewarded = await payCompletions(now)
      logger.info({ closed, opened, rewarded }, 'Weekly themes rolled over')
      return { closed, opened, rewarded }
    },
  }
}
