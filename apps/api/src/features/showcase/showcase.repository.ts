import { memberShowcase, type DbExecutor } from '@storix/db'
import { and, asc, eq } from 'drizzle-orm'

export interface ShowcaseMember {
  leagueId: string
  userId: string
}

const byMember = (m: ShowcaseMember) =>
  and(eq(memberShowcase.leagueId, m.leagueId), eq(memberShowcase.userId, m.userId))

/** Lists the card ids a member saved in their showcase, by slot. */
export async function listSavedShowcase(db: DbExecutor, m: ShowcaseMember): Promise<string[]> {
  const rows = await db
    .select({ cardId: memberShowcase.cardId })
    .from(memberShowcase)
    .where(byMember(m))
    .orderBy(asc(memberShowcase.slot))
  return rows.map((row) => row.cardId)
}

/** Removes a member's saved showcase, which falls back to the automatic one. */
export async function deleteShowcase(db: DbExecutor, m: ShowcaseMember): Promise<void> {
  await db.delete(memberShowcase).where(byMember(m))
}

/** Replaces a member's showcase with the given cards, slot order following the array. */
export async function replaceShowcase(
  db: DbExecutor,
  m: ShowcaseMember & { cardIds: readonly string[] },
): Promise<void> {
  await deleteShowcase(db, m)
  if (m.cardIds.length === 0) return
  await db.insert(memberShowcase).values(
    m.cardIds.map((cardId, index) => ({
      leagueId: m.leagueId,
      userId: m.userId,
      slot: index + 1,
      cardId,
    })),
  )
}
