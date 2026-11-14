import { sql } from 'drizzle-orm'
import { evaluateEmblems, type EmblemId, type EmblemStats } from '@storix/shared/domain'
import type { DbExecutor } from '../client'
import { memberEmblems } from '../schema/index'
import { insertLeagueEvents } from './league-events'

export interface EmblemMember {
  leagueId: string
  userId: string
}

const int = (value: unknown): number => Number(value ?? 0)

/** Reads every counter the emblem catalogue needs for one member of a league, in a single query. */
export async function loadEmblemStats(db: DbExecutor, m: EmblemMember): Promise<EmblemStats> {
  const result = await db.execute<Record<keyof EmblemStats, unknown>>(sql`
    SELECT
      (SELECT coalesce(w.boosters_opened, 0) FROM member_wallets w
        WHERE w.league_id = ${m.leagueId} AND w.user_id = ${m.userId}) AS "boostersOpened",
      (SELECT count(*) FROM booster_openings o
        WHERE o.league_id = ${m.leagueId} AND o.user_id = ${m.userId} AND o.is_premium) AS "premiumOpened",
      (SELECT count(*) FROM cards c
        WHERE c.league_id = ${m.leagueId} AND c.author_id = ${m.userId} AND c.status = 'active') AS "photosPosted",
      (SELECT count(DISTINCT cc.card_id) FROM card_copies cc
        JOIN cards c ON c.id = cc.card_id AND c.status = 'active'
        WHERE cc.league_id = ${m.leagueId} AND cc.owner_id = ${m.userId}) AS "distinctOwned",
      (SELECT count(*) FROM cards c
        WHERE c.league_id = ${m.leagueId} AND c.status = 'active') AS "activeCards",
      (SELECT count(*) FROM reactions r
        JOIN cards c ON c.id = r.card_id AND c.league_id = ${m.leagueId}
        WHERE r.user_id = ${m.userId}) AS "reactionsGiven",
      (SELECT count(*) FROM cards c
        WHERE c.league_id = ${m.leagueId} AND c.discovered_by_id = ${m.userId}) AS "discoveries",
      (SELECT coalesce(sum(s.count), 0) FROM card_copy_stacks s
        WHERE s.league_id = ${m.leagueId} AND s.owner_id = ${m.userId}) AS "stackedTotal",
      (SELECT count(DISTINCT cc.card_id) FROM card_copies cc
        WHERE cc.league_id = ${m.leagueId} AND cc.owner_id = ${m.userId}
          AND cc.variant = 'foil') AS "foilCards",
      (SELECT coalesce(max(per_card.n), 0) FROM (
        SELECT count(*) AS n FROM reactions r
        JOIN cards c ON c.id = r.card_id
        WHERE c.league_id = ${m.leagueId} AND c.author_id = ${m.userId} AND c.status = 'active'
        GROUP BY r.card_id) per_card) AS "maxReactionsOnOwnPhoto",
      (SELECT count(*) FROM card_copies cc
        WHERE cc.league_id = ${m.leagueId} AND cc.owner_id = ${m.userId}
          AND cc.promoted_tier IS NOT NULL) AS "promotedCopies",
      (SELECT count(*) FROM booster_pulls p
        JOIN booster_openings o ON o.id = p.opening_id
        WHERE o.league_id = ${m.leagueId} AND o.user_id = ${m.userId}
          AND p.tier_at_mint >= 'legendary') AS "legendaryPulls",
      (SELECT count(*) FROM booster_pulls p
        JOIN booster_openings o ON o.id = p.opening_id
        WHERE o.league_id = ${m.leagueId} AND o.user_id = ${m.userId}
          AND p.tier_at_mint = 'mythic') AS "mythicPulls",
      (SELECT count(*) FROM cards c
        WHERE c.league_id = ${m.leagueId} AND c.author_id = ${m.userId}
          AND c.status = 'active' AND c.tier = 'mythic') AS "ownMythicPhotos",
      (SELECT count(*) FROM moment_posts mp
        WHERE mp.league_id = ${m.leagueId} AND mp.user_id = ${m.userId}
          AND mp.late_minutes = 0 AND mp.reward_paid_at IS NOT NULL) AS "momentsOnTime",
      (SELECT count(*) FROM card_series_rewards sr
        WHERE sr.league_id = ${m.leagueId} AND sr.user_id = ${m.userId}) AS "seriesCompleted"
  `)
  const row: Partial<Record<keyof EmblemStats, unknown>> = result.rows[0] ?? {}
  return {
    boostersOpened: int(row.boostersOpened),
    premiumOpened: int(row.premiumOpened),
    photosPosted: int(row.photosPosted),
    distinctOwned: int(row.distinctOwned),
    activeCards: int(row.activeCards),
    reactionsGiven: int(row.reactionsGiven),
    discoveries: int(row.discoveries),
    stackedTotal: int(row.stackedTotal),
    foilCards: int(row.foilCards),
    maxReactionsOnOwnPhoto: int(row.maxReactionsOnOwnPhoto),
    promotedCopies: int(row.promotedCopies),
    legendaryPulls: int(row.legendaryPulls),
    mythicPulls: int(row.mythicPulls),
    ownMythicPhotos: int(row.ownMythicPhotos),
    momentsOnTime: int(row.momentsOnTime),
    seriesCompleted: int(row.seriesCompleted),
  }
}

/**
 * Evaluates a member's emblems, inserts the newly earned ones with their feed events. Emblems are never removed.
 * Returns the ids earned by this call, in catalogue order.
 */
export async function awardEarnedEmblems(
  db: DbExecutor,
  m: EmblemMember & { now: Date },
): Promise<EmblemId[]> {
  const stats = await loadEmblemStats(db, m)
  const earned = evaluateEmblems(stats).filter((emblem) => emblem.isEarned)
  if (earned.length === 0) return []
  const inserted = await db
    .insert(memberEmblems)
    .values(
      earned.map((emblem) => ({
        leagueId: m.leagueId,
        userId: m.userId,
        emblemId: emblem.id,
        earnedAt: m.now,
      })),
    )
    .onConflictDoNothing()
    .returning({ emblemId: memberEmblems.emblemId })
  const insertedIds = new Set(inserted.map((row) => row.emblemId))
  const newIds = earned.map((emblem) => emblem.id).filter((id) => insertedIds.has(id))
  await insertLeagueEvents(
    db,
    newIds.map((emblemId) => ({
      leagueId: m.leagueId,
      actorId: m.userId,
      type: 'emblem_unlocked',
      payload: { emblemId },
      dedupeKey: `emblem:${m.leagueId}:${m.userId}:${emblemId}`,
      visibleAt: m.now,
    })),
  )
  return newIds
}
