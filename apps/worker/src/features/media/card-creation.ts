import type { DbExecutor } from '@storix/db'
import { PROVISIONAL_TIER } from '@storix/shared/domain'
import { resolveLeagueSettings, type UploadStatus } from '@storix/shared'
import * as repository from './media.repository'

export interface CardCreationInput {
  upload: repository.OwnedUpload
  mediaId: string
  title: string
  now: Date
  from: readonly UploadStatus[]
}

/** Creates the card of a media and its feed event inside the caller's transaction and marks its upload ready; throws when the upload left the `from` statuses. */
export async function insertCardForMedia(
  tx: DbExecutor,
  input: CardCreationInput,
): Promise<{ cardId: string; number: number }> {
  const { upload, mediaId, title, now, from } = input
  const number = await repository.nextCardNumber(tx, upload.leagueId)
  const cardId = await repository.insertCard(tx, {
    leagueId: upload.leagueId,
    mediaId,
    authorId: upload.userId,
    number,
    title,
    tier: PROVISIONAL_TIER,
    isProvisional: true,
  })
  await repository.insertCardTags(tx, {
    cardId,
    leagueId: upload.leagueId,
    userIds: upload.taggedUserIds,
  })
  await repository.insertAuditEntry(tx, {
    leagueId: upload.leagueId,
    actorId: upload.userId,
    action: 'card.created',
    metadata: { cardId, number, uploadId: upload.id },
  })
  const { newCardDelayMinutes } = resolveLeagueSettings(
    await repository.findLeagueSettings(tx, upload.leagueId),
  )
  await repository.insertLeagueEvents(tx, [
    {
      leagueId: upload.leagueId,
      actorId: upload.userId,
      type: 'card_published',
      cardId,
      dedupeKey: `publish:${cardId}`,
      visibleAt: new Date(now.getTime() + newCardDelayMinutes * 60_000),
    },
  ])
  if ((await repository.markUploadReady(tx, upload.id, cardId, now, from)) === 0) {
    throw new Error(`Upload ${upload.id} left ${from.join('/')} before its card was committed`)
  }
  return { cardId, number }
}
