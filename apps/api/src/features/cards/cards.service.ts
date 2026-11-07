import type { Database } from '@storix/db'
import type {
  CollectionPage,
  ListCardsQuery,
  ReactionCounts,
  ViewerCardDetail,
} from '@storix/shared'
import { notFound } from '../../lib/errors'
import type { MediaSigner } from '../../lib/media-signer'
import { countCardCopies } from '../copies/copies.repository'
import type { Membership } from '../leagues/leagues.service'
import { countReactions } from '../reactions/reactions.repository'
import { findWallet } from '../wallets/wallets.repository'
import { isOwned, toCardDetail, toCollectionCard } from './card-views'
import { countCollection, findCardForViewer, listCollection } from './cards.repository'

const NO_REACTIONS: ReactionCounts = {
  fire: { count: 0, isMine: false },
  heart: { count: 0, isMine: false },
  star: { count: 0, isMine: false },
}

export interface CardsService {
  listCards(m: Membership, query: ListCardsQuery): Promise<CollectionPage>
  getCard(m: Membership, cardId: string): Promise<ViewerCardDetail>
}

export interface CardsServiceDeps {
  db: Database
  signer: MediaSigner
  clock: () => Date
}

/** Builds the cards service serving the viewer's owned cards and locked silhouettes. */
export function createCardsService({ db, signer, clock }: CardsServiceDeps): CardsService {
  return {
    async listCards(m, query) {
      const filters = {
        leagueId: m.leagueId,
        viewerId: m.userId,
        authorId: query.authorId,
        tier: query.tier,
      }
      const [rows, counts] = await Promise.all([
        listCollection(db, { ...filters, beforeNumber: query.cursor, limit: query.limit }),
        countCollection(db, filters),
      ])
      const page = rows.slice(0, query.limit)
      const last = page.at(-1)
      return {
        cards: page.map((row) => toCollectionCard(row, signer)),
        nextCursor: rows.length > query.limit && last !== undefined ? last.number : null,
        total: counts.total,
        ownedCount: counts.owned,
      }
    },

    async getCard(m, cardId) {
      const row = await findCardForViewer(db, {
        leagueId: m.leagueId,
        cardId,
        viewerId: m.userId,
      })
      if (row === null) throw notFound('Card not found')
      const owned = isOwned(row)
      const [wallet, reactions, copiesInLeague] = await Promise.all([
        findWallet(db, m.leagueId, m.userId),
        owned ? countReactions(db, { cardId, viewerId: m.userId }) : NO_REACTIONS,
        owned ? countCardCopies(db, cardId) : 0,
      ])
      return toCardDetail(row, {
        viewerId: m.userId,
        signer,
        now: clock(),
        dust: wallet?.dust ?? 0,
        reactions,
        copiesInLeague,
      })
    },
  }
}
