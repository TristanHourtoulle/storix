import type { Database } from '@storix/db'
import {
  PROMOTION_COPIES,
  planStackTake,
  promotionDecision,
  stackSize,
  type CardTier,
  type ConvertStackBody,
  type StackActionResult,
  type StackEntry,
} from '@storix/shared'
import { AppError, notFound } from '../../lib/errors'
import { insertAuditEntry } from '../audit/audit.repository'
import type { Membership } from '../leagues/leagues.service'
import { lockCardTier, lockOwnedCopies, setPromotedTier } from './copies.repository'
import { copyNotOwned, setDust, withLockedCard, type LockedContext } from './locked-card'
import { lockStackEntries, removeFromStack, type StackKey } from './stacks.repository'

export interface StacksService {
  promote(m: Membership, cardId: string, from: CardTier): Promise<StackActionResult>
  convert(m: Membership, cardId: string, body: ConvertStackBody): Promise<StackActionResult>
}

export interface StacksServiceDeps {
  db: Database
  clock: () => Date
}

function stackChanged(count: number): AppError {
  return new AppError('STACK_CHANGED', 409, 'The stack changed, retry', { count })
}

async function consume(
  ctx: LockedContext,
  key: StackKey,
  taken: readonly StackEntry[],
): Promise<void> {
  for (const entry of taken) await removeFromStack(ctx.tx, { ...key, ...entry })
}

/** Builds the service promoting a copy's personal tier and converting stacked copies to dust, serialized by the member wallet lock. */
export function createStacksService({ db, clock }: StacksServiceDeps): StacksService {
  return {
    promote: (m, cardId, from) =>
      withLockedCard({ db, clock }, m, cardId, async (ctx) => {
        const key = { leagueId: m.leagueId, cardId, ownerId: m.userId }
        const leagueTier = await lockCardTier(ctx.tx, { leagueId: m.leagueId, cardId })
        if (leagueTier === null) throw notFound('Card not found')
        const copies = await lockOwnedCopies(ctx.tx, key)
        if (copies.length === 0) throw copyNotOwned()
        const stack = await lockStackEntries(ctx.tx, key)
        const decision = promotionDecision({ copies, leagueTier, stack, dust: ctx.wallet.dust })
        if (decision.from !== from) {
          throw new AppError('PROMOTION_STALE', 409, 'The promotion step changed', {
            from: decision.from,
          })
        }
        if (decision.reason === 'insufficient_dust') {
          throw new AppError('INSUFFICIENT_DUST', 409, 'Not enough dust for this promotion', {
            cost: decision.cost,
            dust: ctx.wallet.dust,
          })
        }
        const take = planStackTake(stack, PROMOTION_COPIES, 'cheapest')
        const { variant, to, cost } = decision
        if (
          !decision.allowed ||
          variant === null ||
          to === null ||
          cost === null ||
          take === null
        ) {
          throw new AppError('PROMOTION_NOT_ALLOWED', 409, 'This copy cannot be promoted', {
            reason: decision.reason,
          })
        }
        await consume(ctx, key, take.taken)
        const promoted = await setPromotedTier(ctx.tx, {
          cardId,
          ownerId: m.userId,
          variant,
          promotedTier: to,
          now: ctx.now,
        })
        if (!promoted) throw copyNotOwned()
        await insertAuditEntry(ctx.tx, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId: null,
          action: 'copy.promoted',
          metadata: { cardId, variant, from: decision.from, to, cost, taken: take.taken },
        })
        const { dust } = await setDust(ctx, ctx.wallet.dust - cost)
        return { dust, stackCount: stackSize(take.remaining) }
      }),

    convert: (m, cardId, body) =>
      withLockedCard({ db, clock }, m, cardId, async (ctx) => {
        const key = { leagueId: m.leagueId, cardId, ownerId: m.userId }
        const stack = await lockStackEntries(ctx.tx, key)
        const count = stackSize(stack, body.variant)
        if (count !== body.expectedCount) throw stackChanged(count)
        const take = planStackTake(stack, body.quantity, 'richest', body.variant)
        if (take === null) throw stackChanged(count)
        await consume(ctx, key, take.taken)
        await insertAuditEntry(ctx.tx, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId: null,
          action: 'stack.converted',
          metadata: {
            cardId,
            variant: body.variant,
            quantity: body.quantity,
            dust: take.dust,
            taken: take.taken,
          },
        })
        const { dust } = await setDust(ctx, ctx.wallet.dust + take.dust)
        return { dust, stackCount: stackSize(take.remaining) }
      }),
  }
}
