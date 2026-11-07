import type { Database, DbExecutor } from '@storix/db'
import {
  boosterEligibleBefore,
  DEFAULT_NEW_CARD_DELAY_MINUTES,
  boosterPoolDigestInput,
  consumeBooster,
  copyKey,
  createSeededRandom,
  drawBooster,
  DROP_TABLE_VERSION,
  nextPityState,
  resolveLeagueSettings,
  settleBoosterCopies,
  type BoosterCadence,
  type BoosterDraw,
  type BoosterOpening,
  type CardTier,
  type CopySettlement,
  type WalletState,
} from '@storix/shared'
import { generateBoosterSeed, sha256Hex } from '../../lib/crypto'
import { AppError, isUniqueViolation } from '../../lib/errors'
import type { MediaSigner } from '../../lib/media-signer'
import { runInTransaction } from '../../lib/transaction'
import { insertCopy, listOwnedCopies, updateCopyTier } from '../copies/copies.repository'
import { findLeagueSettings } from '../leagues/leagues.repository'
import type { Membership } from '../leagues/leagues.service'
import { toWalletState } from '../wallets/wallet-state'
import {
  ensureWallet,
  lockWallet,
  updateWallet,
  type WalletRow,
} from '../wallets/wallets.repository'
import {
  claimDiscoveries,
  findOpeningByRequest,
  insertOpening,
  insertPulls,
  listBoosterPool,
  listOpeningPulls,
  type BoosterPoolCard,
  type InsertPullRow,
  type OpeningRecord,
} from './boosters.repository'
import { toBoosterPull } from './opening-view'

export interface BoostersService {
  openBooster(m: Membership, requestId: string): Promise<BoosterOpening>
}

export interface BoostersServiceDeps {
  db: Database
  signer: MediaSigner
  clock: () => Date
}

interface OpeningContext {
  tx: DbExecutor
  m: Membership
  requestId: string
  now: Date
  cadence: BoosterCadence
}

function assertLeagueCards(
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

async function discoverySlots(
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

async function mintCopies(
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
      await updateCopyTier(ctx.tx, { ...key, tierAtMint: settlement.tierAtMint, openingId })
    }
  }
}

async function present(
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
    wallet,
  }
}

async function openNewBooster(
  ctx: OpeningContext,
  wallet: WalletRow,
  signer: MediaSigner,
): Promise<BoosterOpening> {
  const consumed = consumeBooster(
    { stock: wallet.boosterStock, anchor: wallet.boosterStockAt },
    ctx.now,
    ctx.cadence,
  )
  if (consumed === null) {
    const { nextAt } = toWalletState(wallet, ctx.cadence, ctx.now).booster
    throw new AppError('BOOSTER_STOCK_EMPTY', 409, 'No booster available', { nextAt })
  }
  const pool = await listBoosterPool(ctx.tx, {
    leagueId: ctx.m.leagueId,
    eligibleBefore: boosterEligibleBefore(ctx.now, DEFAULT_NEW_CARD_DELAY_MINUTES),
  })
  if (pool.length === 0) {
    throw new AppError('BOOSTER_POOL_EMPTY', 409, 'No card can be drawn from this league yet')
  }

  const pityBefore = { sinceEpic: wallet.pitySinceEpic, sinceLegendary: wallet.pitySinceLegendary }
  const seed = generateBoosterSeed()
  const draws = drawBooster({ pool, pity: pityBefore, random: createSeededRandom(seed) })
  assertLeagueCards(pool, draws, ctx.m.leagueId)

  const cardIds = [...new Set(draws.map((draw) => draw.cardId))]
  const ownedRows = await listOwnedCopies(ctx.tx, {
    leagueId: ctx.m.leagueId,
    ownerId: ctx.m.userId,
    cardIds,
  })
  const owned = new Map<string, CardTier>(
    ownedRows.map((copy) => [copyKey(copy.cardId, copy.variant), copy.tierAtMint]),
  )
  const { settlements, dustGained } = settleBoosterCopies(
    draws.map((draw) => ({ cardId: draw.cardId, tier: draw.tier, variant: draw.variant })),
    owned,
  )
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
  })
  await mintCopies(ctx, settlements, opening.id)
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
      isFirstCopy: settlement.isFirstCopyOfCard,
      isDiscovery: discoveries.has(draw.slot),
    }
  })
  await insertPulls(ctx.tx, opening.id, pullRows)

  const pityAfter = nextPityState(
    pityBefore,
    draws.map((draw) => draw.tier),
  )
  const patch = {
    dust: wallet.dust + dustGained,
    boosterStock: consumed.stock,
    boosterStockAt: consumed.anchor,
    pitySinceEpic: pityAfter.sinceEpic,
    pitySinceLegendary: pityAfter.sinceLegendary,
  }
  await updateWallet(ctx.tx, { leagueId: ctx.m.leagueId, userId: ctx.m.userId }, patch)
  const walletState = toWalletState({ ...wallet, ...patch }, ctx.cadence, ctx.now)
  return present(ctx, { ...opening, dustGained }, walletState, signer)
}

/** Builds the service opening boosters in one idempotent, member-serialized transaction. */
export function createBoostersService({ db, signer, clock }: BoostersServiceDeps): BoostersService {
  const withContext = <T>(
    m: Membership,
    requestId: string,
    fn: (ctx: OpeningContext, wallet: WalletRow) => Promise<T>,
  ): Promise<T> =>
    runInTransaction(db, async (tx) => {
      const cadence = resolveLeagueSettings(await findLeagueSettings(tx, m.leagueId)).booster
      await ensureWallet(tx, {
        leagueId: m.leagueId,
        userId: m.userId,
        joinGift: cadence.joinGift,
        now: clock(),
      })
      const wallet = await lockWallet(tx, m.leagueId, m.userId)
      return fn({ tx, m, requestId, now: clock(), cadence }, wallet)
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
    return present(ctx, existing, toWalletState(wallet, ctx.cadence, ctx.now), signer)
  }

  return {
    async openBooster(m, requestId) {
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
    },
  }
}
