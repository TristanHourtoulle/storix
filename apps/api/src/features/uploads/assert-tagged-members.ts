import type { DbExecutor } from '@storix/db'
import { AppError } from '../../lib/errors'
import { listMembers } from '../members/members.repository'

/** Throws VALIDATION_FAILED when any tagged user is not a member of the league. */
export async function assertTaggedMembers(
  db: DbExecutor,
  leagueId: string,
  taggedUserIds: readonly string[],
): Promise<void> {
  if (taggedUserIds.length === 0) return
  const memberIds = new Set((await listMembers(db, leagueId)).map((row) => row.userId))
  if (taggedUserIds.some((id) => !memberIds.has(id))) {
    throw new AppError('VALIDATION_FAILED', 400, 'Tagged users must be league members', {
      field: 'taggedUserIds',
    })
  }
}
