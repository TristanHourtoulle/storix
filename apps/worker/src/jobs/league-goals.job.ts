import type { PgBoss } from 'pg-boss'
import { LEAGUE_GOALS_CLOSE_JOB, LEAGUE_GOALS_TICK_JOB } from '@storix/shared'
import type { LeagueGoalsService } from '../features/league-goal/league-goals.service'

const TICK_CRON = '*/10 * * * *'
const CLOSE_CRON = '5 5 * * 1'
const GOALS_TIMEZONE = 'Europe/Paris'

/** Schedules the league goal tick every 10 minutes and the weekly rollover on Monday 05:05 Paris time. */
export async function registerLeagueGoalsJobs(
  boss: PgBoss,
  service: LeagueGoalsService,
): Promise<void> {
  await boss.createQueue(LEAGUE_GOALS_TICK_JOB)
  await boss.createQueue(LEAGUE_GOALS_CLOSE_JOB)
  await boss.schedule(LEAGUE_GOALS_TICK_JOB, TICK_CRON, null, { tz: GOALS_TIMEZONE })
  await boss.schedule(LEAGUE_GOALS_CLOSE_JOB, CLOSE_CRON, null, { tz: GOALS_TIMEZONE })
  await boss.work(LEAGUE_GOALS_TICK_JOB, { batchSize: 1 }, async () => {
    await service.tick()
  })
  await boss.work(LEAGUE_GOALS_CLOSE_JOB, { batchSize: 1 }, async () => {
    await service.closeAndOpenWeek()
  })
}
