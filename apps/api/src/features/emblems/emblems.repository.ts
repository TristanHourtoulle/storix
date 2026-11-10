import { awardEarnedEmblems, loadEmblemStats, memberEmblems, type DbExecutor } from '@storix/db'
import { isEmblemId, type EmblemId, type EmblemStats } from '@storix/shared'
import { and, asc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'

export interface EmblemMember {
  leagueId: string
  userId: string
}

export interface EarnedEmblemRow {
  id: EmblemId
  earnedAt: Date
  seenAt: Date | null
  featuredRank: number | null
}

const byMember = (m: EmblemMember) =>
  and(eq(memberEmblems.leagueId, m.leagueId), eq(memberEmblems.userId, m.userId))

/** Lists a member's earned emblems, ignoring ids no longer in the catalogue. */
export async function listEarnedEmblems(
  db: DbExecutor,
  m: EmblemMember,
): Promise<EarnedEmblemRow[]> {
  const rows = await db
    .select({
      id: memberEmblems.emblemId,
      earnedAt: memberEmblems.earnedAt,
      seenAt: memberEmblems.seenAt,
      featuredRank: memberEmblems.featuredRank,
    })
    .from(memberEmblems)
    .where(byMember(m))
    .orderBy(asc(memberEmblems.earnedAt))
  return rows.flatMap((row) => (isEmblemId(row.id) ? [{ ...row, id: row.id }] : []))
}

/** Marks the given earned emblems as seen, leaving already seen ones untouched. */
export async function markEmblemsSeen(
  db: DbExecutor,
  m: EmblemMember & { emblemIds: readonly EmblemId[]; now: Date },
): Promise<void> {
  await db
    .update(memberEmblems)
    .set({ seenAt: m.now })
    .where(
      and(
        byMember(m),
        inArray(memberEmblems.emblemId, [...m.emblemIds]),
        isNull(memberEmblems.seenAt),
      ),
    )
}

/** Replaces the member's featured emblems with the given ids, ranked in order. */
export async function replaceFeaturedEmblems(
  db: DbExecutor,
  m: EmblemMember & { emblemIds: readonly EmblemId[] },
): Promise<void> {
  await db
    .update(memberEmblems)
    .set({ featuredRank: null })
    .where(and(byMember(m), isNotNull(memberEmblems.featuredRank)))
  for (const [index, emblemId] of m.emblemIds.entries()) {
    await db
      .update(memberEmblems)
      .set({ featuredRank: index + 1 })
      .where(and(byMember(m), eq(memberEmblems.emblemId, emblemId)))
  }
}

/** Reads the counters behind a member's emblem progress. */
export function readEmblemStats(db: DbExecutor, m: EmblemMember): Promise<EmblemStats> {
  return loadEmblemStats(db, m)
}

/** Inserts a member's newly earned emblems and returns their ids. */
export function insertEarnedEmblems(
  db: DbExecutor,
  m: EmblemMember & { now: Date },
): Promise<EmblemId[]> {
  return awardEarnedEmblems(db, m)
}
