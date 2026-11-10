import { tierRank, type BoundTier, type CardTier } from './cards'
import type { LeagueRole } from './roles'

export const MYTHIC_CAP = 3

export type PinBlock = 'mythic_cap'

export const REMOVAL_REASONS = [
  'admin_deleted',
  'withdrawn',
  'member_removed',
  'member_left',
  'account_deleted',
  'league_deleted',
] as const

export type RemovalReason = (typeof REMOVAL_REASONS)[number]

export interface OwnedLeague {
  leagueId: string
  name: string
  memberCount: number
}

/** Refuses only a new Mythic pin once the league already holds the cap. */
export function canPinTier(input: {
  tier: CardTier | null
  isAlreadyMythic: boolean
  mythicCount: number
}): { allowed: boolean; reason: PinBlock | null } {
  if (input.tier === 'mythic' && !input.isAlreadyMythic && input.mythicCount >= MYTHIC_CAP) {
    return { allowed: false, reason: 'mythic_cap' }
  }
  return { allowed: true, reason: null }
}

/** Returns false only when both bounds are set and the minimum outranks the maximum. */
export function areTierBoundsValid(min: BoundTier | null, max: BoundTier | null): boolean {
  if (min === null || max === null) return true
  return tierRank(min) <= tierRank(max)
}

/** Returns true when the member may withdraw the card from the league. */
export function canWithdrawCard(input: { isTagged: boolean; isAuthor: boolean }): boolean {
  return input.isTagged || input.isAuthor
}

/** Returns true when the owner hands the league to another admin. */
export function canTransferOwnership(input: {
  actorRole: LeagueRole
  targetRole: LeagueRole
  isSelf: boolean
}): boolean {
  return input.actorRole === 'owner' && input.targetRole === 'admin' && !input.isSelf
}

/** Returns true when a member with this role may leave the league. */
export function canLeaveLeague(role: LeagueRole): boolean {
  return role !== 'owner'
}

/** Splits owned leagues into those blocking account deletion and those deleted with it. */
export function accountDeletionPlan(owned: readonly OwnedLeague[]): {
  blocking: OwnedLeague[]
  solo: OwnedLeague[]
} {
  return {
    blocking: owned.filter((league) => league.memberCount > 1),
    solo: owned.filter((league) => league.memberCount === 1),
  }
}
