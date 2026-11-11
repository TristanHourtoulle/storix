import type { Database } from '@storix/db'
import {
  canEquip,
  findCosmetic,
  pickTryOnCards,
  purchaseDecision,
  resolveLeagueSettings,
  type CollectionCard,
  type CosmeticItemId,
  type CosmeticSlot,
  type EquippedCosmetics,
  type MyCosmeticsResponse,
  type PurchaseCosmeticResponse,
} from '@storix/shared'
import { AppError, isUniqueViolation } from '../../lib/errors'
import type { MediaSigner } from '../../lib/media-signer'
import { runInTransaction } from '../../lib/transaction'
import { insertAuditEntry } from '../audit/audit.repository'
import { toCollectionCard, withViewerCopies } from '../cards/card-views'
import { listOwnedCopies } from '../copies/copies.repository'
import { listStackEntries } from '../copies/stacks.repository'
import { findLeagueSettings } from '../leagues/leagues.repository'
import type { Membership } from '../leagues/leagues.service'
import { ensureWallet, lockWallet, updateWallet } from '../wallets/wallets.repository'
import {
  findEquipped,
  insertPurchase,
  listCardRows,
  listOwnedCardTiers,
  listOwnedItemIds,
  upsertEquippedSlot,
} from './cosmetics.repository'

export interface CosmeticsService {
  getMine(userId: string): Promise<MyCosmeticsResponse>
  equip(
    userId: string,
    input: { slot: CosmeticSlot; itemId: CosmeticItemId | null },
  ): Promise<EquippedCosmetics>
  purchase(
    m: Membership,
    input: { itemId: CosmeticItemId; equip: boolean },
  ): Promise<PurchaseCosmeticResponse>
  tryOnCards(m: Membership): Promise<CollectionCard[]>
}

export interface CosmeticsServiceDeps {
  db: Database
  signer: MediaSigner
  clock: () => Date
}

function alreadyOwned(): AppError {
  return new AppError('ALREADY_OWNED', 409, 'This item is already owned')
}

/** Builds the service selling, listing and equipping account-wide cosmetics paid with league dust. */
export function createCosmeticsService({
  db,
  signer,
  clock,
}: CosmeticsServiceDeps): CosmeticsService {
  return {
    async getMine(userId) {
      const [owned, equipped] = await Promise.all([
        listOwnedItemIds(db, userId),
        findEquipped(db, userId),
      ])
      return { owned, equipped }
    },

    async equip(userId, input) {
      const item = input.itemId === null ? null : findCosmetic(input.itemId)
      if (item !== null && (item === undefined || item.slot !== input.slot)) {
        throw new AppError('VALIDATION_FAILED', 400, 'Item does not belong to this slot')
      }
      return runInTransaction(db, async (tx) => {
        const owned = await listOwnedItemIds(tx, userId)
        if (!canEquip({ slot: input.slot, itemId: input.itemId, owned })) {
          throw new AppError('NOT_OWNED', 403, 'This item is not owned')
        }
        await upsertEquippedSlot(tx, { userId, slot: input.slot, itemId: input.itemId })
        return findEquipped(tx, userId)
      })
    },

    async purchase(m, input) {
      const item = findCosmetic(input.itemId)
      if (item === undefined) throw new AppError('VALIDATION_FAILED', 400, 'Unknown item')
      const settings = resolveLeagueSettings(await findLeagueSettings(db, m.leagueId))
      try {
        return await runInTransaction(db, async (tx) => {
          const key = { leagueId: m.leagueId, userId: m.userId }
          await ensureWallet(tx, { ...key, cadence: settings.booster, now: clock() })
          const wallet = await lockWallet(tx, m.leagueId, m.userId)
          const owned = await listOwnedItemIds(tx, m.userId)
          const decision = purchaseDecision({ item, owned, dust: wallet.dust })
          if (decision === 'already_owned') throw alreadyOwned()
          if (decision === 'insufficient_dust') {
            throw new AppError('INSUFFICIENT_DUST', 409, 'Not enough dust for this item', {
              cost: item.price,
              dust: wallet.dust,
            })
          }
          const dust = wallet.dust - item.price
          await updateWallet(tx, key, { dust })
          await insertPurchase(tx, { ...key, itemId: item.id, price: item.price })
          if (input.equip) {
            await upsertEquippedSlot(tx, { userId: m.userId, slot: item.slot, itemId: item.id })
          }
          await insertAuditEntry(tx, {
            leagueId: m.leagueId,
            actorId: m.userId,
            targetUserId: null,
            action: 'cosmetic.purchased',
            metadata: { itemId: item.id, price: item.price },
          })
          return { dust, owned: [...owned, item.id], equipped: await findEquipped(tx, m.userId) }
        })
      } catch (error) {
        if (isUniqueViolation(error)) throw alreadyOwned()
        throw error
      }
    },

    async tryOnCards(m) {
      const member = { leagueId: m.leagueId, userId: m.userId }
      const picked = pickTryOnCards(await listOwnedCardTiers(db, member))
      const cardIds = picked.map((card) => card.id)
      const scope = { leagueId: m.leagueId, ownerId: m.userId, cardIds }
      const [rows, copies, stacks] = await Promise.all([
        listCardRows(db, cardIds),
        listOwnedCopies(db, scope),
        listStackEntries(db, scope),
      ])
      const rowById = new Map(rows.map((row) => [row.cardId, row]))
      return cardIds.flatMap((cardId) => {
        const row = rowById.get(cardId)
        if (row === undefined) return []
        const { cardId: id, ...rest } = row
        return [toCollectionCard(withViewerCopies({ id, ...rest }, copies, stacks), signer)]
      })
    },
  }
}
