import type { Database } from '@storix/db'
import {
  EMBLEM_IDS,
  resolveShowcase,
  type CollectionCard,
  type MemberProfile,
} from '@storix/shared'
import { notFound } from '../../lib/errors'
import type { MediaSigner } from '../../lib/media-signer'
import { toCollectionCard, withViewerCopies } from '../cards/card-views'
import { listOwnedCopies } from '../copies/copies.repository'
import { listStackEntries } from '../copies/stacks.repository'
import { listEarnedEmblems } from '../emblems/emblems.repository'
import { featuredEmblemIds } from '../emblems/emblems.service'
import type { Membership } from '../leagues/leagues.service'
import { toPortraitView } from '../portraits/portrait-view'
import { listSavedShowcase } from '../showcase/showcase.repository'
import {
  findProfileHeader,
  findProfileStats,
  listCardBases,
  listOwnedCardsRanked,
} from './member-profile.repository'

export interface MemberProfileService {
  getProfile(m: Membership, userId: string): Promise<MemberProfile>
}

export interface MemberProfileServiceDeps {
  db: Database
  signer: MediaSigner
}

/** Builds the service serving a member's page header, stats, showcase and tab counts. */
export function createMemberProfileService({
  db,
  signer,
}: MemberProfileServiceDeps): MemberProfileService {
  async function showcaseFor(
    m: Membership,
    member: { leagueId: string; userId: string },
  ): Promise<{ cards: CollectionCard[]; isCustom: boolean }> {
    const [saved, ranked] = await Promise.all([
      listSavedShowcase(db, member),
      listOwnedCardsRanked(db, member),
    ])
    const cardIds = resolveShowcase(saved, ranked)
    const viewer = { leagueId: m.leagueId, ownerId: m.userId, cardIds }
    const [bases, copies, stacks] = await Promise.all([
      listCardBases(db, { leagueId: m.leagueId, cardIds }),
      listOwnedCopies(db, viewer),
      listStackEntries(db, viewer),
    ])
    const baseById = new Map(bases.map((base) => [base.id, base]))
    const cards = cardIds.flatMap((cardId) => {
      const base = baseById.get(cardId)
      return base === undefined
        ? []
        : [toCollectionCard(withViewerCopies(base, copies, stacks), signer)]
    })
    return { cards, isCustom: saved.length > 0 }
  }

  return {
    async getProfile(m, userId) {
      const member = { leagueId: m.leagueId, userId }
      const header = await findProfileHeader(db, member)
      if (header === null) throw notFound('Member not found')
      const isSelf = userId === m.userId
      const [stats, earned, showcase] = await Promise.all([
        findProfileStats(db, member),
        listEarnedEmblems(db, member),
        showcaseFor(m, member),
      ])
      const completionPercent =
        stats.activeCards === 0 ? 0 : Math.round((stats.cardsOwned / stats.activeCards) * 100)
      return {
        header: {
          userId,
          displayUsername: header.displayUsername,
          avatar:
            header.avatarUploadId === null || header.avatarColor === null
              ? null
              : toPortraitView(
                  {
                    kind: 'avatar',
                    ownerId: userId,
                    uploadId: header.avatarUploadId,
                    dominantColor: header.avatarColor,
                  },
                  signer,
                ),
          joinedAt: header.joinedAt.toISOString(),
          isSelf,
          featuredEmblems: featuredEmblemIds(earned),
        },
        stats: {
          photosPosted: stats.photosPosted,
          cardsOwned: stats.cardsOwned,
          discoveries: stats.discoveries,
          bestTier: stats.bestTier,
          ...(isSelf ? { completionPercent: Math.min(100, completionPercent) } : {}),
        },
        showcase: showcase.cards,
        isShowcaseCustom: showcase.isCustom,
        counts: {
          photos: stats.photosPosted,
          tagged: stats.taggedCount,
          emblemsEarned: earned.length,
          emblemsTotal: EMBLEM_IDS.length,
        },
      }
    },
  }
}
