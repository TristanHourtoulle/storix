import type { Database } from '@storix/db'
import {
  activeCharmOf,
  boosterEligibleBefore,
  charmDust,
  boosterPoolDigestInput,
  canOpenBooster,
  computeBoosterStock,
  copyKey,
  copyValueTier,
  createSeededRandom,
  drawBooster,
  DROP_TABLE_VERSION,
  isPremiumBooster,
  isPullCharmBoosted,
  MIN_DRAWABLE_CARDS_FOR_BOOSTER,
  nextPityState,
  pickBoosterSource,
  resolveLeagueSettings,
  settleBoosterCopies,
  spendCharmCharge,
  stackCountsByCard,
  type BoosterOpening,
  type OwnedPullTarget,
} from '@storix/shared'
import { generateBoosterSeed, sha256Hex } from '../../lib/crypto'
import { AppError, isUniqueViolation } from '../../lib/errors'
import type { MediaSigner } from '../../lib/media-signer'
import { runInTransaction } from '../../lib/transaction'
import { awardAfter, type EmblemAwards } from '../emblems/emblems.service'
import { listOwnedCopies } from '../copies/copies.repository'
import { addToStack, listStackEntries } from '../copies/stacks.repository'
import { insertLeagueEvents } from '../league-feed/league-events.repository'
import { findLeagueSettings } from '../leagues/leagues.repository'
import type { Membership } from '../leagues/leagues.service'
import {
  ensureWallet,
  lockWallet,
  updateWallet,
  type WalletRow,
} from '../wallets/wallets.repository'
import {
  findOpeningByRequest,
  insertOpening,
  insertPulls,
  listBoosterPool,
  type InsertPullRow,
} from './boosters.repository'
import {
  assertLeagueCards,
  charmPatch,
  consumeFromSource,
  discoverySlots,
  mintCopies,
  openingEvents,
  ownedPoolCardIds,
  present,
  walletStateFor,
  type OpeningContext,
} from './booster-opening'

export interface BoostersService {
  openBooster(m: Membership, requestId: string): Promise<BoosterOpening>
}

export interface BoostersServiceDeps {
  db: Database
  signer: MediaSigner
  clock: () => Date
  emblems: EmblemAwards
}

async function openNewBooster(
  ctx: OpeningContext,
  wallet: WalletRow,
  signer: MediaSigner,
): Promise<BoosterOpening> {
  const stockState = { stock: wallet.boosterStock, anchor: wallet.boosterStockAt }
  const timed = computeBoosterStock(stockState, ctx.now, ctx.cadence)
  const source = pickBoosterSource({
    premiumGifts: wallet.premiumGifts,
    availableStock: timed.available,
    bonus: wallet.bonusBoosters,
  })
  if (source === null) {
    throw new AppError('BOOSTER_STOCK_EMPTY', 409, 'No booster available', {
      nextAt: timed.nextAt === null ? null : timed.nextAt.toISOString(),
    })
  }
  const consumedPatch = consumeFromSource(source, wallet, stockState, ctx)
  const pool = await listBoosterPool(ctx.tx, {
    leagueId: ctx.m.leagueId,
    eligibleBefore: boosterEligibleBefore(ctx.now, ctx.delayMinutes),
  })
  const drawableCount = new Set(pool.map((card) => card.cardId)).size
  if (!canOpenBooster(drawableCount)) {
    throw new AppError('BOOSTER_POOL_EMPTY', 409, 'Not enough distinct cards to fill a booster', {
      drawableCount,
      minimumCards: MIN_DRAWABLE_CARDS_FOR_BOOSTER,
    })
  }

  const pityBefore = { sinceEpic: wallet.pitySinceEpic, sinceLegendary: wallet.pitySinceLegendary }
  const seed = generateBoosterSeed()
  const isPremium = source === 'premium_gift' || isPremiumBooster(wallet.boostersOpened)
  const activeCharm = activeCharmOf(wallet)
  const charm = activeCharm?.id ?? null
  const charmChargesAfter =
    activeCharm === null ? null : (spendCharmCharge(activeCharm)?.charges ?? 0)
  const draws = drawBooster({
    pool,
    pity: pityBefore,
    random: createSeededRandom(seed),
    isPremium,
    charm,
    ownedCardIds: await ownedPoolCardIds(ctx, pool, charm),
  })
  assertLeagueCards(pool, draws, ctx.m.leagueId)

  const cardIds = [...new Set(draws.map((draw) => draw.cardId))]
  const ownedRows = await listOwnedCopies(ctx.tx, {
    leagueId: ctx.m.leagueId,
    ownerId: ctx.m.userId,
    cardIds,
  })
  const owned = new Map<string, OwnedPullTarget>(
    ownedRows.map((copy) => [
      copyKey(copy.cardId, copy.variant),
      { tierAtMint: copy.tierAtMint, valueTier: copyValueTier(copy) },
    ]),
  )
  const stackEntries = await listStackEntries(ctx.tx, {
    leagueId: ctx.m.leagueId,
    ownerId: ctx.m.userId,
    cardIds,
  })
  const stackCounts = stackCountsByCard(stackEntries)
  const settled = settleBoosterCopies(
    draws.map((draw) => ({ cardId: draw.cardId, tier: draw.tier, variant: draw.variant })),
    owned,
    stackCounts,
  )
  const settlements = settled.settlements.map((settlement) => ({
    ...settlement,
    dust: charmDust(settlement.dust, charm),
  }))
  const dustGained = settlements.reduce((total, settlement) => total + settlement.dust, 0)
  const discoveries = await discoverySlots(ctx, draws)

  const opening = await insertOpening(ctx.tx, {
    leagueId: ctx.m.leagueId,
    userId: ctx.m.userId,
    requestId: ctx.requestId,
    seed,
    tableVersion: DROP_TABLE_VERSION,
    pityBefore,
    poolDigest: sha256Hex(boosterPoolDigestInput(pool)),
    dustGained,
    isPremium,
    source,
    charm,
    charmChargesAfter,
  })
  await mintCopies(ctx, settlements, opening.id)
  await addToStack(
    ctx.tx,
    settlements.flatMap((settlement) =>
      settlement.stacked === null
        ? []
        : [
            {
              leagueId: ctx.m.leagueId,
              cardId: settlement.cardId,
              ownerId: ctx.m.userId,
              variant: settlement.stacked.variant,
              tierAtMint: settlement.stacked.tierAtMint,
              count: 1,
            },
          ],
    ),
    ctx.now,
  )
  const pullRows = draws.map((draw, index): InsertPullRow => {
    const settlement = settlements[index]
    if (settlement === undefined) throw new Error('Booster draw has no copy settlement')
    return {
      slot: draw.slot,
      cardId: draw.cardId,
      rolledTier: draw.rolledTier,
      tierAtMint: settlement.tierAtMint,
      variant: settlement.variant,
      outcome: settlement.outcome,
      dust: settlement.dust,
      stackCount: settlement.stackCountAfter,
      isFirstCopy: settlement.isFirstCopyOfCard,
      isDiscovery: discoveries.has(draw.slot),
      isCharmBoosted: isPullCharmBoosted({
        charm,
        variant: settlement.variant,
        dust: settlement.dust,
        isRedirected: draw.isRedirected,
        isLuckBoosted: draw.isLuckBoosted,
      }),
    }
  })
  await insertPulls(ctx.tx, opening.id, pullRows)
  await insertLeagueEvents(ctx.tx, openingEvents(ctx.m, { ...opening, charm }, pullRows))

  const pityAfter = nextPityState(
    pityBefore,
    draws.map((draw) => draw.tier),
  )
  const patch = {
    ...consumedPatch,
    dust: wallet.dust + dustGained,
    pitySinceEpic: pityAfter.sinceEpic,
    pitySinceLegendary: pityAfter.sinceLegendary,
    boostersOpened: wallet.boostersOpened + 1,
    boosterFullNotifiedAt: null,
    ...charmPatch(activeCharm),
  }
  await updateWallet(ctx.tx, { leagueId: ctx.m.leagueId, userId: ctx.m.userId }, patch)
  const walletState = await walletStateFor(ctx, { ...wallet, ...patch })
  return present(ctx, { ...opening, dustGained, charm, charmChargesAfter }, walletState, signer)
}

/** Builds the service opening boosters in one idempotent, member-serialized transaction. */
export function createBoostersService({
  db,
  signer,
  clock,
  emblems,
}: BoostersServiceDeps): BoostersService {
  const withContext = <T>(
    m: Membership,
    requestId: string,
    fn: (ctx: OpeningContext, wallet: WalletRow) => Promise<T>,
  ): Promise<T> =>
    runInTransaction(db, async (tx) => {
      const settings = resolveLeagueSettings(await findLeagueSettings(tx, m.leagueId))
      const cadence = settings.booster
      await ensureWallet(tx, {
        leagueId: m.leagueId,
        userId: m.userId,
        cadence,
        now: clock(),
      })
      const wallet = await lockWallet(tx, m.leagueId, m.userId)
      return fn(
        { tx, m, requestId, now: clock(), cadence, delayMinutes: settings.newCardDelayMinutes },
        wallet,
      )
    })

  const presentStored = async (
    ctx: OpeningContext,
    wallet: WalletRow,
  ): Promise<BoosterOpening | null> => {
    const existing = await findOpeningByRequest(ctx.tx, {
      leagueId: ctx.m.leagueId,
      userId: ctx.m.userId,
      requestId: ctx.requestId,
    })
    if (existing === null) return null
    return present(ctx, existing, await walletStateFor(ctx, wallet), signer)
  }

  async function openOrReplay(m: Membership, requestId: string): Promise<BoosterOpening> {
    try {
      return await withContext(
        m,
        requestId,
        async (ctx, wallet) =>
          (await presentStored(ctx, wallet)) ?? openNewBooster(ctx, wallet, signer),
      )
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
      const stored = await withContext(m, requestId, presentStored)
      if (stored === null) throw error
      return stored
    }
  }

  return {
    openBooster: (m, requestId) => awardAfter(emblems, [m], openOrReplay(m, requestId)),
  }
}
