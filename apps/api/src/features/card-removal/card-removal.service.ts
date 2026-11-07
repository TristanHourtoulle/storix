import type { DbExecutor } from '@storix/db'
import { compensateRemovedCopies, mediaPrefix, type RemovalReason } from '@storix/shared'
import type { JobQueue } from '../../jobs/job-queue'
import type { ErrorLogger } from '../../lib/error-logger'
import { insertAuditEntry } from '../audit/audit.repository'
import {
  creditDust,
  deleteCards,
  deleteMedia,
  deleteUploadsForMedia,
  insertCompensations,
  insertTombstones,
  listCopiesOfCards,
  lockCards,
} from './card-removal.repository'

export interface RemovalOutcome {
  removedCardIds: string[]
  objectKeys: string[]
  compensatedOwners: number
  dust: number
}

export interface RemovalInput {
  leagueId: string
  cardIds: readonly string[]
  reason: RemovalReason
  actorId: string | null
}

export interface CardRemoval {
  /** Removes the cards inside the caller's transaction; the caller must hold the league economy lock. */
  removeInTx(tx: DbExecutor, input: RemovalInput): Promise<RemovalOutcome>
  /** Deletes the files and recomputes rarity after commit; failures are logged, never thrown. */
  afterCommit(leagueId: string, outcome: RemovalOutcome): Promise<void>
}

export interface CardRemovalDeps {
  jobs: JobQueue
  logger: ErrorLogger
}

const EMPTY_OUTCOME: RemovalOutcome = {
  removedCardIds: [],
  objectKeys: [],
  compensatedOwners: 0,
  dust: 0,
}

/** Builds the card removal core shared by every flow that deletes cards. */
export function createCardRemoval({ jobs, logger }: CardRemovalDeps): CardRemoval {
  return {
    async removeInTx(tx, input) {
      if (input.cardIds.length === 0) return EMPTY_OUTCOME
      const locked = await lockCards(tx, [...new Set(input.cardIds)])
      const removable = locked.filter(
        (card) => card.leagueId === input.leagueId && card.leagueIdOfMedia === input.leagueId,
      )
      if (removable.length === 0) return EMPTY_OUTCOME
      const cardIds = removable.map((card) => card.id)

      const compensations = compensateRemovedCopies(await listCopiesOfCards(tx, cardIds))
      for (const owner of compensations) {
        await creditDust(tx, { leagueId: input.leagueId, userId: owner.ownerId, dust: owner.dust })
      }
      const compensationRows = compensations.flatMap((owner) =>
        owner.perCard.map((entry) => ({
          cardId: entry.cardId,
          leagueId: input.leagueId,
          userId: owner.ownerId,
          dust: entry.dust,
        })),
      )
      await insertCompensations(tx, compensationRows)

      await insertTombstones(
        tx,
        removable.map((card) => ({
          cardId: card.id,
          leagueId: input.leagueId,
          number: card.number,
          mediaPrefix: mediaPrefix({
            leagueId: card.leagueIdOfMedia,
            sourceSha256: card.sourceSha256,
          }),
          reason: input.reason,
          actorId: input.actorId,
        })),
      )
      await deleteCards(tx, cardIds)
      await deleteMedia(
        tx,
        removable.map((card) => card.mediaId),
      )
      await deleteUploadsForMedia(
        tx,
        removable.map((card) => card.uploadId),
      )

      for (const card of removable) {
        const perCard = compensationRows.filter((row) => row.cardId === card.id)
        await insertAuditEntry(tx, {
          leagueId: input.leagueId,
          actorId: input.actorId,
          targetUserId: card.authorId,
          action: 'card.removed',
          metadata: {
            number: card.number,
            reason: input.reason,
            compensatedOwners: perCard.length,
            dust: perCard.reduce((sum, row) => sum + row.dust, 0),
          },
        })
      }

      return {
        removedCardIds: cardIds,
        objectKeys: removable.flatMap((card) => card.variantKeys),
        compensatedOwners: compensations.length,
        dust: compensations.reduce((sum, owner) => sum + owner.dust, 0),
      }
    },

    async afterCommit(leagueId, outcome) {
      if (outcome.removedCardIds.length === 0) return
      try {
        if (outcome.objectKeys.length > 0) await jobs.enqueueStorageDelete(outcome.objectKeys)
      } catch (error) {
        logger.error(
          { err: error, leagueId, keys: outcome.objectKeys.length },
          'Failed to enqueue removed card files deletion',
        )
      }
      try {
        await jobs.enqueueRarityRecompute({ leagueId })
      } catch (error) {
        logger.error({ err: error, leagueId }, 'Failed to enqueue rarity recompute after removal')
      }
    },
  }
}
