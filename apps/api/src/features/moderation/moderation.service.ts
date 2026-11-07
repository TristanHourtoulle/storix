import type { Database, DbExecutor } from '@storix/db'
import {
  areTierBoundsValid,
  boosterEligibleBefore,
  canPinTier,
  COMPUTED_TIERS,
  MYTHIC_CAP,
  PROVISIONAL_TIER,
  resolveEffectiveTier,
  resolveLeagueSettings,
  type AdminCard,
  type AdminCardPage,
  type AdminCardsQuery,
  type CardTier,
  type ComputedTier,
} from '@storix/shared'
import type { JobQueue } from '../../jobs/job-queue'
import type { ErrorLogger } from '../../lib/error-logger'
import { AppError, notFound } from '../../lib/errors'
import type { MediaSigner } from '../../lib/media-signer'
import { runInTransaction } from '../../lib/transaction'
import { insertAuditEntry, type AuditEntry } from '../audit/audit.repository'
import type { CardRemoval } from '../card-removal/card-removal.service'
import { findLeagueSettings } from '../leagues/leagues.repository'
import type { Membership } from '../leagues/leagues.service'
import { asComputedTier, toAdminCard } from './admin-card-view'
import {
  countMythicPins,
  findAdminCard,
  findCardForModeration,
  insertRarityHistory,
  listAdminCards,
  lockLeagueEconomyExclusive,
  lockLeagueModeration,
  setCaptureDateValidated,
  updateCardModeration,
  type CardStatus,
  type ModerationCardRow,
} from './moderation.repository'

export interface TierBounds {
  min: ComputedTier | null
  max: ComputedTier | null
}

export interface ModerationService {
  listCards(m: Membership, query: AdminCardsQuery): Promise<AdminCardPage>
  setVisibility(m: Membership, cardId: string, status: CardStatus): Promise<AdminCard>
  pinTier(m: Membership, cardId: string, tier: CardTier | null): Promise<AdminCard>
  setBounds(m: Membership, cardId: string, bounds: TierBounds): Promise<AdminCard>
  setCaptureDateValidated(m: Membership, cardId: string, isValidated: boolean): Promise<AdminCard>
  deleteCard(m: Membership, cardId: string): Promise<void>
}

export interface ModerationServiceDeps {
  db: Database
  signer: MediaSigner
  clock: () => Date
  jobs: JobQueue
  cardRemoval: CardRemoval
  logger: ErrorLogger
}

interface ModerationContext {
  tx: DbExecutor
  m: Membership
  card: ModerationCardRow
  now: Date
}

type AuditChange = Pick<AuditEntry, 'action' | 'metadata'>

interface TierRules {
  pinnedTier: CardTier | null
  minTier: ComputedTier | null
  maxTier: ComputedTier | null
}

async function delayMinutesOf(tx: DbExecutor, leagueId: string): Promise<number> {
  return resolveLeagueSettings(await findLeagueSettings(tx, leagueId)).newCardDelayMinutes
}

async function applyTierRules(ctx: ModerationContext, rules: TierRules) {
  const effective = resolveEffectiveTier({
    computed: asComputedTier(ctx.card.computedTier ?? PROVISIONAL_TIER) ?? COMPUTED_TIERS[0],
    pinned: rules.pinnedTier,
    min: rules.minTier,
    max: rules.maxTier,
  })
  await updateCardModeration(ctx.tx, ctx.card.id, {
    ...rules,
    tier: effective.tier,
    tierSource: effective.source,
  })
  const after = { ...rules, tier: effective.tier, tierSource: effective.source }
  if (effective.tier === ctx.card.tier) return after
  await insertRarityHistory(ctx.tx, {
    leagueId: ctx.m.leagueId,
    cardId: ctx.card.id,
    fromTier: ctx.card.tier,
    toTier: effective.tier,
    source: effective.source,
    score: ctx.card.score,
    percentile: ctx.card.percentile,
    computedAt: ctx.now,
  })
  return after
}

function currentRules(card: ModerationCardRow): TierRules {
  return {
    pinnedTier: card.pinnedTier,
    minTier: asComputedTier(card.minTier),
    maxTier: asComputedTier(card.maxTier),
  }
}

function tierState(card: ModerationCardRow, rules: TierRules) {
  return { ...rules, tier: card.tier, tierSource: card.tierSource }
}

/** Builds the admin service moderating league cards, serialized per league by the moderation lock. */
export function createModerationService(deps: ModerationServiceDeps): ModerationService {
  const { db, signer, clock, jobs, cardRemoval, logger } = deps

  const recomputeRarity = async (leagueId: string): Promise<void> => {
    try {
      await jobs.enqueueRarityRecompute({ leagueId })
    } catch (error) {
      logger.error({ err: error, leagueId }, 'Failed to enqueue rarity recompute after moderation')
    }
  }

  const moderate = async (
    m: Membership,
    cardId: string,
    change: (ctx: ModerationContext) => Promise<AuditChange | null>,
  ): Promise<AdminCard> => {
    const { card, changed } = await runInTransaction(db, async (tx) => {
      await lockLeagueModeration(tx, m.leagueId)
      const locked = await findCardForModeration(tx, { leagueId: m.leagueId, cardId })
      if (locked === null) throw notFound('Card not found')
      const audit = await change({ tx, m, card: locked, now: clock() })
      if (audit !== null) {
        await insertAuditEntry(tx, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId: locked.authorId,
          action: audit.action,
          metadata: { cardId, number: locked.number, ...audit.metadata },
        })
      }
      const row = await findAdminCard(tx, { leagueId: m.leagueId, cardId })
      if (row === null) throw notFound('Card not found')
      const delayMinutes = await delayMinutesOf(tx, m.leagueId)
      return { card: toAdminCard(row, { signer, delayMinutes }), changed: audit !== null }
    })
    if (changed) await recomputeRarity(m.leagueId)
    return card
  }

  return {
    async listCards(m, query) {
      const delayMinutes = await delayMinutesOf(db, m.leagueId)
      const [rows, mythicCount] = await Promise.all([
        listAdminCards(db, {
          leagueId: m.leagueId,
          filter: query.filter,
          beforeNumber: query.cursor,
          limit: query.limit,
          eligibleBefore: boosterEligibleBefore(clock(), delayMinutes),
        }),
        countMythicPins(db, m.leagueId),
      ])
      const page = rows.slice(0, query.limit)
      const last = page.at(-1)
      return {
        cards: page.map((row) => toAdminCard(row, { signer, delayMinutes })),
        nextCursor: rows.length > query.limit && last !== undefined ? last.number : null,
        mythicCount,
      }
    },

    setVisibility: (m, cardId, status) =>
      moderate(m, cardId, async ({ tx, card }) => {
        if (card.status === status) return null
        await updateCardModeration(tx, card.id, { status })
        return {
          action: status === 'hidden' ? 'card.hidden' : 'card.unhidden',
          metadata: { before: { status: card.status }, after: { status } },
        }
      }),

    pinTier: (m, cardId, tier) =>
      moderate(m, cardId, async (ctx) => {
        if (ctx.card.pinnedTier === tier) return null
        const mythicCount = await countMythicPins(ctx.tx, m.leagueId)
        const decision = canPinTier({
          tier,
          isAlreadyMythic: ctx.card.pinnedTier === 'mythic',
          mythicCount,
        })
        if (!decision.allowed) {
          throw new AppError('MYTHIC_CAP_REACHED', 409, 'The league already has its Mythic cards', {
            mythicCap: MYTHIC_CAP,
            mythicCount,
          })
        }
        const before = currentRules(ctx.card)
        const after = await applyTierRules(ctx, { ...before, pinnedTier: tier })
        return {
          action: 'card.tier_pinned',
          metadata: { before: tierState(ctx.card, before), after },
        }
      }),

    setBounds: (m, cardId, bounds) =>
      moderate(m, cardId, async (ctx) => {
        if (!areTierBoundsValid(bounds.min, bounds.max)) {
          throw new AppError('INVALID_TIER_BOUNDS', 400, 'The minimum tier outranks the maximum', {
            min: bounds.min,
            max: bounds.max,
          })
        }
        const before = currentRules(ctx.card)
        if (before.minTier === bounds.min && before.maxTier === bounds.max) return null
        const after = await applyTierRules(ctx, {
          ...before,
          minTier: bounds.min,
          maxTier: bounds.max,
        })
        return {
          action: 'card.bounds_set',
          metadata: { before: tierState(ctx.card, before), after },
        }
      }),

    setCaptureDateValidated: (m, cardId, isValidated) =>
      moderate(m, cardId, async ({ tx, card }) => {
        if (card.capturedAt === null) {
          throw new AppError('CAPTURE_DATE_MISSING', 409, 'This card has no capture date')
        }
        if (card.isCaptureDateValidated === isValidated) return null
        await setCaptureDateValidated(tx, card.mediaId, isValidated)
        return {
          action: 'card.capture_date_validated',
          metadata: {
            capturedAt: card.capturedAt.toISOString(),
            before: { isCaptureDateValidated: card.isCaptureDateValidated },
            after: { isCaptureDateValidated: isValidated },
          },
        }
      }),

    async deleteCard(m, cardId) {
      const outcome = await runInTransaction(db, async (tx) => {
        await lockLeagueEconomyExclusive(tx, m.leagueId)
        await lockLeagueModeration(tx, m.leagueId)
        const card = await findCardForModeration(tx, { leagueId: m.leagueId, cardId })
        if (card === null) throw notFound('Card not found')
        const removed = await cardRemoval.removeInTx(tx, {
          leagueId: m.leagueId,
          cardIds: [cardId],
          reason: 'admin_deleted',
          actorId: m.userId,
        })
        if (removed.removedCardIds.length === 0) throw notFound('Card not found')
        await insertAuditEntry(tx, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId: card.authorId,
          action: 'card.deleted',
          metadata: {
            cardId,
            number: card.number,
            before: { status: card.status, tier: card.tier, tierSource: card.tierSource },
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
