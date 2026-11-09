import type { Database, DbExecutor } from '@storix/db'
import {
  dustValue,
  resolveLeagueSettings,
  type CopyVariant,
  type DustBalance,
} from '@storix/shared'
import { AppError, notFound } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import { insertAuditEntry } from '../audit/audit.repository'
import { craftDecisionFor, foilUpgradeDecisionFor } from '../cards/card-views'
import { findCardForViewer, type CardViewerRow } from '../cards/cards.repository'
import { findLeagueSettings } from '../leagues/leagues.repository'
import type { Membership } from '../leagues/leagues.service'
import {
  ensureWallet,
  lockWallet,
  updateWallet,
  type WalletRow,
} from '../wallets/wallets.repository'
import { deleteCopy, insertCopy, updateCopyVariant } from './copies.repository'

export interface CopiesService {
  recycle(m: Membership, cardId: string, variant: CopyVariant): Promise<DustBalance>
  craft(m: Membership, cardId: string): Promise<DustBalance>
  upgradeToFoil(m: Membership, cardId: string): Promise<DustBalance>
}

export interface CopiesServiceDeps {
  db: Database
  clock: () => Date
}

interface LockedContext {
  tx: DbExecutor
  m: Membership
  wallet: WalletRow
  card: CardViewerRow
  now: Date
  delayMinutes: number
}

function copyNotOwned(): AppError {
  return new AppError('COPY_NOT_OWNED', 409, 'You do not own this copy')
}

async function setDust(ctx: LockedContext, dust: number): Promise<DustBalance> {
  await updateWallet(ctx.tx, { leagueId: ctx.m.leagueId, userId: ctx.m.userId }, { dust })
  return { dust }
}

/** Builds the service spending and earning dust on copies, serialized by the member wallet lock. */
export function createCopiesService({ db, clock }: CopiesServiceDeps): CopiesService {
  const withLockedCard = <T>(
    m: Membership,
    cardId: string,
    fn: (ctx: LockedContext) => Promise<T>,
  ): Promise<T> =>
    runInTransaction(db, async (tx) => {
      const now = clock()
      const { booster, newCardDelayMinutes } = resolveLeagueSettings(
        await findLeagueSettings(tx, m.leagueId),
      )
      await ensureWallet(tx, {
        leagueId: m.leagueId,
        userId: m.userId,
        cadence: booster,
        now,
      })
      const wallet = await lockWallet(tx, m.leagueId, m.userId)
      const card = await findCardForViewer(tx, {
        leagueId: m.leagueId,
        cardId,
        viewerId: m.userId,
      })
      if (card === null || card.status !== 'active') throw notFound('Card not found')
      return fn({ tx, m, wallet, card, now, delayMinutes: newCardDelayMinutes })
    })

  return {
    recycle: (m, cardId, variant) =>
      withLockedCard(m, cardId, async (ctx) => {
        const deleted = await deleteCopy(ctx.tx, { cardId, ownerId: m.userId, variant })
        if (deleted === null) throw copyNotOwned()
        const { tierAtMint } = deleted
        const dust = dustValue(tierAtMint, variant)
        await insertAuditEntry(ctx.tx, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId: null,
          action: 'copy.recycled',
          metadata: { cardId, variant, tierAtMint, dust },
        })
        return setDust(ctx, ctx.wallet.dust + dust)
      }),

    craft: (m, cardId) =>
      withLockedCard(m, cardId, async (ctx) => {
        const decision = craftDecisionFor(ctx.card, {
          now: ctx.now,
          dust: ctx.wallet.dust,
          delayMinutes: ctx.delayMinutes,
        })
        if (decision.reason === 'insufficient_dust') {
          throw new AppError('INSUFFICIENT_DUST', 409, 'Not enough dust to craft this card', {
            cost: decision.cost,
            dust: ctx.wallet.dust,
          })
        }
        if (!decision.allowed || decision.cost === null) {
          throw new AppError('CRAFT_NOT_ALLOWED', 409, 'This card cannot be crafted', {
            reason: decision.reason,
          })
        }
        await insertCopy(ctx.tx, {
          leagueId: m.leagueId,
          cardId,
          ownerId: m.userId,
          variant: 'normal',
          tierAtMint: ctx.card.tier,
          source: 'craft',
          openingId: null,
        })
        await insertAuditEntry(ctx.tx, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId: null,
          action: 'copy.crafted',
          metadata: { cardId, tierAtMint: ctx.card.tier, cost: decision.cost },
        })
        return setDust(ctx, ctx.wallet.dust - decision.cost)
      }),

    upgradeToFoil: (m, cardId) =>
      withLockedCard(m, cardId, async (ctx) => {
        const decision = foilUpgradeDecisionFor(ctx.card, ctx.wallet.dust)
        if (decision.reason === 'insufficient_dust') {
          throw new AppError('INSUFFICIENT_DUST', 409, 'Not enough dust for a foil upgrade', {
            cost: decision.cost,
            dust: ctx.wallet.dust,
          })
        }
        if (!decision.allowed) {
          throw new AppError('FOIL_NOT_ALLOWED', 409, 'This copy cannot be upgraded to foil', {
            reason: decision.reason,
          })
        }
        const updated = await updateCopyVariant(ctx.tx, {
          cardId,
          ownerId: m.userId,
          from: 'normal',
          to: 'foil',
        })
        if (!updated) throw copyNotOwned()
        await insertAuditEntry(ctx.tx, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId: null,
          action: 'copy.foil_upgraded',
          metadata: { cardId, tierAtMint: ctx.card.normalTier, cost: decision.cost },
        })
        return setDust(ctx, ctx.wallet.dust - decision.cost)
      }),
  }
}
