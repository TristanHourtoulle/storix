import type { Database } from '@storix/db'
import {
  activeCharmOf,
  CHARM_CHARGES,
  CHARM_WEEK_MS,
  CHARM_WEEKLY_LIMIT,
  charmPurchaseDecision,
  charmPurchasesInWeek,
  findCharm,
  resolveLeagueSettings,
  type CharmId,
  type CharmShopResponse,
  type PurchaseCharmResponse,
} from '@storix/shared'
import { AppError } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import { insertAuditEntry } from '../audit/audit.repository'
import { findLeagueSettings } from '../leagues/leagues.repository'
import type { Membership } from '../leagues/leagues.service'
import { ensureWallet, findWallet, lockWallet, updateWallet } from '../wallets/wallets.repository'
import { insertCharmPurchase, leagueHasMythic, listCharmPurchaseDates } from './charms.repository'

export interface CharmsService {
  getShop(m: Membership): Promise<CharmShopResponse>
  purchase(
    m: Membership,
    input: { charmId: CharmId; replaceCharm: CharmId | null },
  ): Promise<PurchaseCharmResponse>
}

export interface CharmsServiceDeps {
  db: Database
  clock: () => Date
}

function refusal(
  decision: Exclude<ReturnType<typeof charmPurchaseDecision>, 'ok'>,
  price: number,
  dust: number,
): AppError {
  switch (decision) {
    case 'already_active':
      return new AppError('CHARM_ALREADY_ACTIVE', 409, 'This charm is already active')
    case 'needs_replace':
      return new AppError('CHARM_ACTIVE', 409, 'The active charm changed; confirm the replacement')
    case 'weekly_limit':
      return new AppError('CHARM_WEEKLY_LIMIT', 409, 'Weekly charm purchase limit reached', {
        limit: CHARM_WEEKLY_LIMIT,
      })
    case 'insufficient_dust':
      return new AppError('INSUFFICIENT_DUST', 409, 'Not enough dust for this charm', {
        cost: price,
        dust,
      })
  }
}

/** Builds the service selling porte-bonheur charms paid with league dust, one active charm at a time. */
export function createCharmsService({ db, clock }: CharmsServiceDeps): CharmsService {
  const weekStart = (now: Date) => new Date(now.getTime() - CHARM_WEEK_MS)

  return {
    async getShop(m) {
      const settings = resolveLeagueSettings(await findLeagueSettings(db, m.leagueId))
      const now = clock()
      const key = { leagueId: m.leagueId, userId: m.userId }
      await ensureWallet(db, { ...key, cadence: settings.booster, now })
      const [wallet, dates, hasMythic] = await Promise.all([
        findWallet(db, m.leagueId, m.userId),
        listCharmPurchaseDates(db, { ...key, since: weekStart(now) }),
        leagueHasMythic(db, m.leagueId),
      ])
      if (wallet === null) throw new Error('Member wallet not found')
      return {
        dust: wallet.dust,
        active: activeCharmOf(wallet),
        purchasesThisWeek: charmPurchasesInWeek(dates, now),
        weeklyLimit: CHARM_WEEKLY_LIMIT,
        hasMythic,
      }
    },

    async purchase(m, input) {
      const charm = findCharm(input.charmId)
      if (charm === undefined) throw new AppError('VALIDATION_FAILED', 400, 'Unknown charm')
      const settings = resolveLeagueSettings(await findLeagueSettings(db, m.leagueId))
      return runInTransaction(db, async (tx) => {
        const now = clock()
        const key = { leagueId: m.leagueId, userId: m.userId }
        await ensureWallet(tx, { ...key, cadence: settings.booster, now })
        const wallet = await lockWallet(tx, m.leagueId, m.userId)
        const active = activeCharmOf(wallet)
        const dates = await listCharmPurchaseDates(tx, { ...key, since: weekStart(now) })
        const purchasesThisWeek = charmPurchasesInWeek(dates, now)
        const decision = charmPurchaseDecision({
          charm,
          active,
          replaceCharm: input.replaceCharm,
          purchasesThisWeek,
          dust: wallet.dust,
        })
        if (decision !== 'ok') throw refusal(decision, charm.price, wallet.dust)
        const dust = wallet.dust - charm.price
        await updateWallet(tx, key, { dust, charm: charm.id, charmCharges: CHARM_CHARGES })
        await insertCharmPurchase(tx, {
          ...key,
          charm: charm.id,
          price: charm.price,
          purchasedAt: now,
        })
        await insertAuditEntry(tx, {
          leagueId: m.leagueId,
          actorId: m.userId,
          targetUserId: null,
          action: 'charm.purchased',
          metadata: {
            charm: charm.id,
            price: charm.price,
            ...(active === null ? {} : { replaced: active.id, lostCharges: active.charges }),
          },
        })
        return {
          dust,
          active: { id: charm.id, charges: CHARM_CHARGES },
          purchasesThisWeek: purchasesThisWeek + 1,
        }
      })
    },
  }
}
