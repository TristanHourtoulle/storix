import type { Database } from '@storix/db'
import type {
  CardDetail,
  CardPage,
  CardSummary,
  ListCardsQuery,
  MediaVariantSize,
} from '@storix/shared'
import { notFound } from '../../lib/errors'
import type { MediaSigner } from '../../lib/media-signer'
import type { Membership } from '../leagues/leagues.service'
import { toImageSet } from './image-set'
import { countCards, findCard, listCards, type CardRow } from './cards.repository'

const SUMMARY_SIZES: readonly MediaVariantSize[] = [256, 768]
const DETAIL_SIZES: readonly MediaVariantSize[] = [256, 768, 1600]

export interface CardsService {
  listCards(m: Membership, query: ListCardsQuery): Promise<CardPage>
  getCard(m: Membership, cardId: string): Promise<CardDetail>
}

function toSummary(
  row: CardRow,
  sizes: readonly MediaVariantSize[],
  signer: MediaSigner,
): CardSummary {
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    tier: row.tier,
    isProvisional: row.isProvisional,
    author: { userId: row.authorId, displayUsername: row.authorName },
    thumbhash: row.thumbhash,
    dominantColor: row.dominantColor,
    width: row.width,
    height: row.height,
    image: toImageSet(row.variants, sizes, signer),
  }
}

/** Builds the cards service. */
export function createCardsService(deps: { db: Database; signer: MediaSigner }): CardsService {
  const { db, signer } = deps
  return {
    async listCards(m, query) {
      const [rows, total] = await Promise.all([
        listCards(db, {
          leagueId: m.leagueId,
          authorId: query.authorId,
          beforeNumber: query.cursor,
          limit: query.limit,
        }),
        countCards(db, { leagueId: m.leagueId, authorId: query.authorId }),
      ])
      const page = rows.slice(0, query.limit)
      const last = page.at(-1)
      return {
        cards: page.map((row) => toSummary(row, SUMMARY_SIZES, signer)),
        nextCursor: rows.length > query.limit && last !== undefined ? last.number : null,
        total,
      }
    },

    async getCard(m, cardId) {
      const row = await findCard(db, m.leagueId, cardId)
      if (row === null) throw notFound('Card not found')
      return {
        ...toSummary(row, DETAIL_SIZES, signer),
        capturedAt: row.capturedAt?.toISOString() ?? null,
        isCaptureDateValidated: row.isCaptureDateValidated,
        createdAt: row.createdAt.toISOString(),
        tagged: row.tagged.map((person) => ({
          userId: person.userId,
          displayUsername: person.displayUsername,
        })),
      }
    },
  }
}
