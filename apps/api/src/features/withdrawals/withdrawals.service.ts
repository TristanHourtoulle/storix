import type { Database } from '@storix/db'
import { canWithdrawCard, type MediaVariantSize, type TaggedCard } from '@storix/shared'
import { AppError, notFound } from '../../lib/errors'
import type { MediaSigner } from '../../lib/media-signer'
import { runInTransaction } from '../../lib/transaction'
import { insertAuditEntry } from '../audit/audit.repository'
import { toImageSet } from '../cards/image-set'
import type { CardRemoval } from '../card-removal/card-removal.service'
import type { Membership } from '../leagues/leagues.service'
import {
  findWithdrawableCard,
  isTagged,
  listTaggedCards,
  lockLeagueEconomyExclusive,
  lockLeagueModeration,
} from './withdrawals.repository'

const TAGGED_SIZES: readonly MediaVariantSize[] = [256, 768]

export interface WithdrawalsService {
  listTaggedCards(m: Membership): Promise<TaggedCard[]>
  withdraw(m: Membership, cardId: string): Promise<void>
}

export interface WithdrawalsServiceDeps {
  db: Database
  signer: MediaSigner
  cardRemoval: CardRemoval
}

/** Builds the service letting tagged members and authors list and withdraw their cards. */
export function createWithdrawalsService(deps: WithdrawalsServiceDeps): WithdrawalsService {
  const { db, signer, cardRemoval } = deps

  return {
    async listTaggedCards(m) {
      const rows = await listTaggedCards(db, { leagueId: m.leagueId, userId: m.userId })
      return rows.map((row) => ({
        id: row.id,
        number: row.number,
        title: row.title,
        tier: row.tier,
        status: row.status,
        author: { userId: row.authorId, displayUsername: row.authorName },
        thumbhash: row.thumbhash,
        dominantColor: row.dominantColor,
        width: row.width,
        height: row.height,
        image: toImageSet(row.variants, TAGGED_SIZES, signer),
        canWithdraw: true,
      }))
    },

    async withdraw(m, cardId) {
      const outcome = await runInTransaction(db, async (tx) => {
        await lockLeagueEconomyExclusive(tx, m.leagueId)
        await lockLeagueModeration(tx, m.leagueId)
        const card = await findWithdrawableCard(tx, { leagueId: m.leagueId, cardId })
        if (card === null) throw notFound('Card not found')
        const allowed = canWithdrawCard({
          isTagged: await isTagged(tx, { cardId, userId: m.userId }),
          isAuthor: card.authorId === m.userId,
        })
        if (!allowed) {
          throw new AppError('WITHDRAW_NOT_ALLOWED', 403, 'You cannot withdraw this card')
        }
        const removed = await cardRemoval.removeInTx(tx, {
          leagueId: m.leagueId,
          cardIds: [cardId],
          reason: 'withdrawn',
          actorId: m.userId,
        })
        if (removed.removedCardIds.length === 0) throw notFound('Card not found')
        await insertAuditEntry(tx, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId: card.authorId,
          action: 'card.withdrawn',
          metadata: {
            cardId,
            number: card.number,
            before: { status: card.status, tier: card.tier },
            after: null,
            compensatedOwners: removed.compensatedOwners,
            dust: removed.dust,
          },
        })
        return removed
      })
      await cardRemoval.afterCommit(m.leagueId, outcome)
    },
  }
}
