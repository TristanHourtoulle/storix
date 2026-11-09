import type { Database, DbExecutor } from '@storix/db'
import {
  boosterEligibleBefore,
  boosterPoolDigestInput,
  canOpenBooster,
  computeBoosterStock,
  consumeBooster,
  copyKey,
  createSeededRandom,
  drawBooster,
  DROP_TABLE_VERSION,
  MIN_DRAWABLE_CARDS_FOR_BOOSTER,
  nextPityState,
  resolveLeagueSettings,
  settleBoosterCopies,
  type BoosterCadence,
  type BoosterDraw,
  type BoosterOpening,
  type CardTier,
  type CopySettlement,
  type RecentReveal,
  type WalletState,
} from '@storix/shared'
import { generateBoosterSeed, sha256Hex } from '../../lib/crypto'
import { AppError, isUniqueViolation } from '../../lib/errors'
import type { MediaSigner } from '../../lib/media-signer'
import { runInTransaction } from '../../lib/transaction'
import { toCollectionCard, withViewerCopies, type CollectionCardBase } from '../cards/card-views'
import { insertCopy, listOwnedCopies, updateCopyTier } from '../copies/copies.repository'
import { addToStack, listStackEntries } from '../copies/stacks.repository'
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
  listRecentReveals,
  type BoosterPoolCard,
  type InsertPullRow,
  type OpeningRecord,
  type RevealRow,
} from './boosters.repository'
import { toBoosterPull } from './opening-view'
import { loadPoolAvailability } from './pool-availability'

export interface BoostersService {
  openBooster(m: Membership, requestId: string): Promise<BoosterOpening>
  listRecentReveals(m: Membership): Promise<RecentReveal[]>
}

const REVEALS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const REVEALS_LIMIT = 6

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
  delayMinutes: number
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

async function walletStateFor(ctx: OpeningContext, wallet: WalletRow): Promise<WalletState> {
  const pool = await loadPoolAvailability(ctx.tx, {
    leagueId: ctx.m.leagueId,
    now: ctx.now,
    delayMinutes: ctx.delayMinutes,
  })
  return toWalletState(wallet, ctx.cadence, ctx.now, pool)
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
    const { nextAt } = computeBoosterStock(
      { stock: wallet.boosterStock, anchor: wallet.boosterStockAt },
      ctx.now,
      ctx.cadence,
    )
    throw new AppError('BOOSTER_STOCK_EMPTY', 409, 'No booster available', {
      nextAt: nextAt === null ? null : nextAt.toISOString(),
    })
  }
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
  const stackEntries = await listStackEntries(ctx.tx, {
    leagueId: ctx.m.leagueId,
    ownerId: ctx.m.userId,
    cardIds,
  })
  const stackCounts = stackEntries.reduce<ReadonlyMap<string, number>>(
    (acc, entry) => new Map([...acc, [entry.cardId, (acc.get(entry.cardId) ?? 0) + entry.count]]),
    new Map(),
  )
  const { settlements } = settleBoosterCopies(
    draws.map((draw) => ({ cardId: draw.cardId, tier: draw.tier, variant: draw.variant })),
    owned,
    stackCounts,
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
    dustGained: 0,
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
      dust: 0,
      stackCount: settlement.stackCountAfter,
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
    boosterStock: consumed.stock,
    boosterStockAt: consumed.anchor,
    pitySinceEpic: pityAfter.sinceEpic,
    pitySinceLegendary: pityAfter.sinceLegendary,
    boosterFullNotifiedAt: null,
  }
  await updateWallet(ctx.tx, { leagueId: ctx.m.leagueId, userId: ctx.m.userId }, patch)
  const walletState = await walletStateFor(ctx, { ...wallet, ...patch })
  return present(ctx, { ...opening, dustGained: 0 }, walletState, signer)
}

function toRevealCard(row: RevealRow): CollectionCardBase {
  return {
    id: row.cardId,
    number: row.number,
    title: row.title,
    status: row.status,
    tier: row.tier,
    isProvisional: row.isProvisional,
    authorId: row.authorId,
    authorName: row.authorName,
    authorIsFormerMember: row.authorIsFormerMember,
    thumbhash: row.thumbhash,
    dominantColor: row.dominantColor,
    width: row.width,
    height: row.height,
    variants: row.variants,
  }
}

/** Builds the service opening boosters in one idempotent, member-serialized transaction. */
export function createBoostersService({ db, signer, clock }: BoostersServiceDeps): BoostersService {
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

  return {
    async listRecentReveals(m) {
      const rows = await listRecentReveals(db, {
        leagueId: m.leagueId,
        since: new Date(clock().getTime() - REVEALS_WINDOW_MS),
        limit: REVEALS_LIMIT,
      })
      const cardIds = [...new Set(rows.map((row) => row.cardId))]
      const [copies, stacks] = await Promise.all([
        listOwnedCopies(db, { leagueId: m.leagueId, ownerId: m.userId, cardIds }),
        listStackEntries(db, { leagueId: m.leagueId, ownerId: m.userId, cardIds }),
      ])
      return rows.map((row) => ({
        pulledBy: { userId: row.pulledById, displayUsername: row.pulledByName },
        pulledAt: row.pulledAt.toISOString(),
        variant: row.variant,
        tierAtMint: row.tierAtMint,
        card: toCollectionCard(withViewerCopies(toRevealCard(row), copies, stacks), signer),
      }))
    },

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
