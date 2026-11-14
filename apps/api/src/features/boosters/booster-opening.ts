import type { DbExecutor } from '@storix/db'
import {
  activeCharmOf,
  consumeBooster,
  isTierAtLeast,
  spendCharmCharge,
  tierRank,
  type ActiveCharm,
  type BoosterCadence,
  type BoosterDraw,
  type BoosterOpening,
  type BoosterSource,
  type BoosterStockState,
  type CardTier,
  type CharmId,
  type CopySettlement,
  type WalletState,
} from '@storix/shared'
import type { MediaSigner } from '../../lib/media-signer'
import { insertCopy, listOwnedCopies, updateCopyTier } from '../copies/copies.repository'
import type { NewLeagueEvent } from '../league-feed/league-events.repository'
import type { Membership } from '../leagues/leagues.service'
import { toWalletState } from '../wallets/wallet-state'
import type { WalletPatch, WalletRow } from '../wallets/wallets.repository'
import {
  claimDiscoveries,
  listOpeningPulls,
  type BoosterPoolCard,
  type InsertPullRow,
  type OpeningRecord,
} from './boosters.repository'
import { toBoosterPull } from './opening-view'
import { loadPoolAvailability } from './pool-availability'

export interface OpeningContext {
  tx: DbExecutor
  m: Membership
  requestId: string
  now: Date
  cadence: BoosterCadence
  delayMinutes: number
}

export function assertLeagueCards(
  pool: readonly BoosterPoolCard[],
  draws: readonly BoosterDraw[],
  leagueId: string,
): void {
  const poolIds = new Set(pool.map((card) => card.cardId))
  const foreign =
    pool.some((card) => card.leagueId !== leagueId) ||
    draws.some((draw) => !poolIds.has(draw.cardId))
  if (foreign) throw new Error('Booster draw contains a card outside the opening league')
}

export async function discoverySlots(
  ctx: OpeningContext,
  draws: readonly BoosterDraw[],
): Promise<ReadonlySet<number>> {
  const firstSlotByCard = draws.reduce<ReadonlyMap<string, number>>(
    (acc, draw) => (acc.has(draw.cardId) ? acc : new Map([...acc, [draw.cardId, draw.slot]])),
    new Map(),
  )
  const claimed = await claimDiscoveries(ctx.tx, {
    cardIds: [...firstSlotByCard.keys()],
    userId: ctx.m.userId,
    now: ctx.now,
  })
  return new Set(
    claimed.flatMap((cardId) => {
      const slot = firstSlotByCard.get(cardId)
      return slot === undefined ? [] : [slot]
    }),
  )
}

export async function mintCopies(
  ctx: OpeningContext,
  settlements: readonly CopySettlement[],
  openingId: string,
): Promise<void> {
  for (const settlement of settlements) {
    const key = { cardId: settlement.cardId, ownerId: ctx.m.userId, variant: settlement.variant }
    if (settlement.outcome === 'new') {
      await insertCopy(ctx.tx, {
        ...key,
        leagueId: ctx.m.leagueId,
        tierAtMint: settlement.tierAtMint,
        source: 'booster',
        openingId,
      })
    } else if (settlement.outcome === 'upgraded') {
      await updateCopyTier(ctx.tx, {
        ...key,
        tierAtMint: settlement.tierAtMint,
        openingId,
        now: ctx.now,
      })
    }
  }
}

export async function walletStateFor(ctx: OpeningContext, wallet: WalletRow): Promise<WalletState> {
  const pool = await loadPoolAvailability(ctx.tx, {
    leagueId: ctx.m.leagueId,
    now: ctx.now,
    delayMinutes: ctx.delayMinutes,
  })
  return toWalletState(wallet, ctx.cadence, ctx.now, pool)
}

function openingCharm(opening: OpeningRecord): BoosterOpening['charm'] {
  const used =
    opening.charm === null ? null : activeCharmOf({ charm: opening.charm, charmCharges: 1 })
  if (used === null) return null
  return { id: used.id, chargesLeft: opening.charmChargesAfter ?? 0 }
}

export async function present(
  ctx: OpeningContext,
  opening: OpeningRecord,
  wallet: WalletState,
  signer: MediaSigner,
): Promise<BoosterOpening> {
  const pulls = await listOpeningPulls(ctx.tx, opening.id)
  return {
    id: opening.id,
    openedAt: opening.openedAt.toISOString(),
    pulls: pulls.map((row) => toBoosterPull(row, signer)),
    dustGained: opening.dustGained,
    isPremium: opening.isPremium,
    charm: openingCharm(opening),
    wallet,
  }
}

export async function ownedPoolCardIds(
  ctx: OpeningContext,
  pool: readonly BoosterPoolCard[],
  charm: CharmId | null,
): Promise<ReadonlySet<string>> {
  if (charm !== 'boussole' && charm !== 'aimant') return new Set()
  const rows = await listOwnedCopies(ctx.tx, {
    leagueId: ctx.m.leagueId,
    ownerId: ctx.m.userId,
    cardIds: [...new Set(pool.map((card) => card.cardId))],
  })
  return new Set(rows.map((row) => row.cardId))
}

/** The wallet change once a booster spent a charge of the active charm. */
export function charmPatch(
  active: ActiveCharm | null,
): Pick<WalletPatch, 'charm' | 'charmCharges'> {
  if (active === null) return {}
  const next = spendCharmCharge(active)
  return { charm: next?.id ?? null, charmCharges: next?.charges ?? 0 }
}

export function consumeFromSource(
  source: BoosterSource,
  wallet: WalletRow,
  stockState: BoosterStockState,
  ctx: OpeningContext,
): Pick<WalletPatch, 'boosterStock' | 'boosterStockAt' | 'bonusBoosters' | 'premiumGifts'> {
  if (source === 'premium_gift') return { premiumGifts: wallet.premiumGifts - 1 }
  if (source === 'bonus') return { bonusBoosters: wallet.bonusBoosters - 1 }
  const consumed = consumeBooster(stockState, ctx.now, ctx.cadence)
  if (consumed === null) throw new Error('Timed booster source without available stock')
  return { boosterStock: consumed.stock, boosterStockAt: consumed.anchor }
}

export function openingEvents(
  m: Membership,
  opening: { id: string; openedAt: Date; isPremium: boolean; charm: CharmId | null },
  pulls: readonly InsertPullRow[],
): NewLeagueEvent[] {
  const bestTier = pulls.reduce<CardTier | null>(
    (best, pull) =>
      best === null || tierRank(pull.tierAtMint) > tierRank(best) ? pull.tierAtMint : best,
    null,
  )
  const base = { leagueId: m.leagueId, actorId: m.userId, visibleAt: opening.openedAt }
  const notable = pulls.filter((pull) => isTierAtLeast(pull.tierAtMint, 'epic') || pull.isDiscovery)
  return [
    {
      ...base,
      type: 'booster_opened',
      payload: {
        openingId: opening.id,
        isPremium: opening.isPremium,
        ...(bestTier === null ? {} : { tier: bestTier }),
        ...(opening.charm === null ? {} : { charm: opening.charm }),
      },
      dedupeKey: `opening:${opening.id}`,
    },
    ...notable.map((pull): NewLeagueEvent => ({
      ...base,
      type: 'card_pulled',
      cardId: pull.cardId,
      tier: pull.tierAtMint,
      payload: { openingId: opening.id, tier: pull.tierAtMint, isDiscovery: pull.isDiscovery },
      dedupeKey: `pull:${opening.id}:${pull.slot}`,
    })),
  ]
}
