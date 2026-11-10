import type { Database } from '@storix/db'
import {
  copyDustValue,
  copyValueTier,
  stackSize,
  type CopyVariant,
  type DustBalance,
} from '@storix/shared'
import { AppError } from '../../lib/errors'
import { insertAuditEntry } from '../audit/audit.repository'
import { awardAfter, type EmblemAwards } from '../emblems/emblems.service'
import { craftDecisionFor, foilUpgradeDecisionFor } from '../cards/card-views'
import type { Membership } from '../leagues/leagues.service'
import { deleteCopy, insertCopy, lockOwnedCopies, updateCopyVariant } from './copies.repository'
import { copyNotOwned, setDust, withLockedCard, type LockedContext } from './locked-card'
import { lockStackEntries } from './stacks.repository'

export interface CopiesService {
  recycle(m: Membership, cardId: string, variant: CopyVariant): Promise<DustBalance>
  craft(m: Membership, cardId: string): Promise<DustBalance>
  upgradeToFoil(m: Membership, cardId: string): Promise<DustBalance>
}

export interface CopiesServiceDeps {
  db: Database
  clock: () => Date
  emblems: EmblemAwards
}

/** Builds the service spending and earning dust on copies, serialized by the member wallet lock. */
export function createCopiesService({ db, clock, emblems }: CopiesServiceDeps): CopiesService {
  const locked = <T>(m: Membership, cardId: string, fn: (ctx: LockedContext) => Promise<T>) =>
    withLockedCard({ db, clock }, m, cardId, fn)

  return {
    recycle: (m, cardId, variant) =>
      locked(m, cardId, async (ctx) => {
        const key = { leagueId: m.leagueId, cardId, ownerId: m.userId }
        const copies = await lockOwnedCopies(ctx.tx, key)
        const stack = await lockStackEntries(ctx.tx, key)
        if (!copies.some((copy) => copy.variant === variant)) throw copyNotOwned()
        if (copies.length === 1 && stackSize(stack) > 0) {
          throw new AppError('STACK_NOT_EMPTY', 409, 'Convert the stack first')
        }
        const deleted = await deleteCopy(ctx.tx, { cardId, ownerId: m.userId, variant })
        if (deleted === null) throw copyNotOwned()
        const dust = copyDustValue({ variant, ...deleted })
        await insertAuditEntry(ctx.tx, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId: null,
          action: 'copy.recycled',
          metadata: {
            cardId,
            variant,
            tierAtMint: deleted.tierAtMint,
            promotedTier: deleted.promotedTier,
            dust,
          },
        })
        return setDust(ctx, ctx.wallet.dust + dust)
      }),

    craft: (m, cardId) =>
      locked(m, cardId, async (ctx) => {
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
      awardAfter(
        emblems,
        [m],
        locked(m, cardId, async (ctx) => {
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
            metadata: {
              cardId,
              tierAtMint: ctx.card.normalTier,
              valueTier:
                ctx.card.normalTier === null
                  ? null
                  : copyValueTier({
                      tierAtMint: ctx.card.normalTier,
                      promotedTier: ctx.card.normalPromotedTier,
                    }),
              cost: decision.cost,
            },
          })
          return setDust(ctx, ctx.wallet.dust - decision.cost)
        }),
      ),
  }
}
