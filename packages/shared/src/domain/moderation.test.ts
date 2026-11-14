import { describe, expect, it } from 'vitest'
import {
  MYTHIC_CAP,
  REMOVAL_REASONS,
  accountDeletionPlan,
  areTierBoundsValid,
  canLeaveLeague,
  canPinTier,
  canTransferOwnership,
  canWithdrawCard,
} from './moderation'

describe('moderation rules', () => {
  it('caps mythic pins at 3', () => {
    expect(MYTHIC_CAP).toBe(3)
    expect(canPinTier({ tier: 'mythic', isAlreadyMythic: false, mythicCount: 2 })).toEqual({
      allowed: true,
      reason: null,
    })
    expect(canPinTier({ tier: 'mythic', isAlreadyMythic: false, mythicCount: 3 })).toEqual({
      allowed: false,
      reason: 'mythic_cap',
    })
    expect(canPinTier({ tier: 'mythic', isAlreadyMythic: true, mythicCount: 3 }).allowed).toBe(true)
    expect(canPinTier({ tier: 'epic', isAlreadyMythic: false, mythicCount: 3 }).allowed).toBe(true)
    expect(canPinTier({ tier: null, isAlreadyMythic: true, mythicCount: 3 }).allowed).toBe(true)
  })

  it('validates bounds', () => {
    expect(areTierBoundsValid('rare', 'epic')).toBe(true)
    expect(areTierBoundsValid('rare', 'rare')).toBe(true)
    expect(areTierBoundsValid('epic', 'rare')).toBe(false)
    expect(areTierBoundsValid(null, 'common')).toBe(true)
    expect(areTierBoundsValid('legendary', null)).toBe(true)
    expect(areTierBoundsValid(null, null)).toBe(true)
  })

  it('decides withdrawal, transfer and leave', () => {
    expect(canWithdrawCard({ isTagged: true, isAuthor: false })).toBe(true)
    expect(canWithdrawCard({ isTagged: false, isAuthor: true })).toBe(true)
    expect(canWithdrawCard({ isTagged: false, isAuthor: false })).toBe(false)
    expect(canTransferOwnership({ actorRole: 'owner', targetRole: 'admin', isSelf: false })).toBe(
      true,
    )
    expect(canTransferOwnership({ actorRole: 'owner', targetRole: 'admin', isSelf: true })).toBe(
      false,
    )
    expect(canTransferOwnership({ actorRole: 'owner', targetRole: 'member', isSelf: false })).toBe(
      false,
    )
    expect(canTransferOwnership({ actorRole: 'admin', targetRole: 'admin', isSelf: false })).toBe(
      false,
    )
    expect(canLeaveLeague('owner')).toBe(false)
    expect(canLeaveLeague('admin')).toBe(true)
    expect(canLeaveLeague('member')).toBe(true)
  })

  it('splits owned leagues for account deletion', () => {
    const a = { leagueId: 'a', name: 'A', memberCount: 1 }
    const b = { leagueId: 'b', name: 'B', memberCount: 4 }
    expect(accountDeletionPlan([a, b])).toEqual({ blocking: [b], solo: [a] })
    expect(accountDeletionPlan([])).toEqual({ blocking: [], solo: [] })
  })

  it('lists removal reasons', () => {
    expect(REMOVAL_REASONS).toEqual([
      'admin_deleted',
      'withdrawn',
      'member_removed',
      'member_left',
      'account_deleted',
      'league_deleted',
    ])
  })
})
