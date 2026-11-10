import type { Database } from '@storix/db'
import {
  LEGACY_COLLECTION_CURSOR,
  encodeCollectionCursor,
  rarityJourney,
  resolveLeagueSettings,
  type CollectionPage,
  type ListCardsQuery,
  type RarityHistory,
  type ReactionCounts,
  type ViewerCardDetail,
} from '@storix/shared'
import { notFound } from '../../lib/errors'
import type { MediaSigner } from '../../lib/media-signer'
import { countCardCopies } from '../copies/copies.repository'
import { listPromotedHolderCopies, listStackEntries } from '../copies/stacks.repository'
import { findLeagueSettings } from '../leagues/leagues.repository'
import type { Membership } from '../leagues/leagues.service'
import { countReactions } from '../reactions/reactions.repository'
import { findWallet } from '../wallets/wallets.repository'
import {
  isOwned,
  isVisibleTo,
  nextCollectionCursor,
  toCardDetail,
  toCollectionCard,
  toPromotedHolders,
} from './card-views'
import { countCollection, findCardForViewer, listCollection } from './cards.repository'
import {
  findViewerPromotion,
  listRarityHistory,
  RARITY_HISTORY_LIMIT,
} from './rarity-history.repository'

const NO_REACTIONS: ReactionCounts = {
  fire: { count: 0, isMine: false },
  heart: { count: 0, isMine: false },
  star: { count: 0, isMine: false },
}

export interface CardsService {
  listCards(m: Membership, query: ListCardsQuery): Promise<CollectionPage>
  getCard(m: Membership, cardId: string): Promise<ViewerCardDetail>
  getRarityHistory(m: Membership, cardId: string): Promise<RarityHistory>
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
        upgradable: query.upgradable,
      }
      if (query.cursor === LEGACY_COLLECTION_CURSOR) {
        const counts = await countCollection(db, filters)
        return { cards: [], nextCursor: null, total: counts.total, ownedCount: counts.owned }
      }
      const [rows, counts] = await Promise.all([
        listCollection(db, {
          ...filters,
          sort: query.sort,
          after: query.cursor,
          limit: query.limit,
        }),
        countCollection(db, filters),
      ])
      const page = rows.slice(0, query.limit)
      const last = page.at(-1)
      return {
        cards: page.map((row) => toCollectionCard(row, signer)),
        nextCursor:
          rows.length > query.limit && last !== undefined
            ? encodeCollectionCursor(nextCollectionCursor(query.sort, last))
            : null,
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
      if (row === null || !isVisibleTo(row)) throw notFound('Card not found')
      const owned = isOwned(row) && row.status === 'active'
      const [settings, wallet, reactions, copiesInLeague, stack, holderRows] = await Promise.all([
        findLeagueSettings(db, m.leagueId),
        findWallet(db, m.leagueId, m.userId),
        owned ? countReactions(db, { cardId, viewerId: m.userId }) : NO_REACTIONS,
        owned ? countCardCopies(db, cardId) : 0,
        owned
          ? listStackEntries(db, { leagueId: m.leagueId, ownerId: m.userId, cardIds: [cardId] })
          : [],
        owned ? listPromotedHolderCopies(db, { cardId, excludeOwnerId: m.userId }) : [],
      ])
      return toCardDetail(row, {
        viewerId: m.userId,
        signer,
        now: clock(),
        dust: wallet?.dust ?? 0,
        reactions,
        copiesInLeague,
        delayMinutes: resolveLeagueSettings(settings).newCardDelayMinutes,
        stack: stack.map(({ variant, tierAtMint, count }) => ({ variant, tierAtMint, count })),
        promotedHolders: toPromotedHolders(holderRows, row.tier),
      })
    },

    async getRarityHistory(m, cardId) {
      const row = await findCardForViewer(db, {
        leagueId: m.leagueId,
        cardId,
        viewerId: m.userId,
      })
      if (row === null || !isOwned(row) || row.status !== 'active') {
        throw notFound('Card not found')
      }
      const [rows, mine] = await Promise.all([
        listRarityHistory(db, { cardId, limit: RARITY_HISTORY_LIMIT }),
        findViewerPromotion(db, { leagueId: m.leagueId, cardId, ownerId: m.userId }),
      ])
      return { steps: rarityJourney(rows, mine) }
    },
  }
}
