import { describe, expect, it } from 'vitest'
import { canChangeRole, canManageInvitations, canRemoveMember, hasRoleAtLeast } from './roles'

describe('roles', () => {
  it('ranks roles', () => {
    expect(hasRoleAtLeast('admin', 'member')).toBe(true)
    expect(hasRoleAtLeast('admin', 'owner')).toBe(false)
  })
  it('lets admins and owners manage invitations', () => {
    expect(canManageInvitations('admin')).toBe(true)
    expect(canManageInvitations('member')).toBe(false)
  })
  it('only the owner changes roles, never on self or the owner, never to owner', () => {
    expect(
      canChangeRole({ actorRole: 'owner', targetRole: 'member', nextRole: 'admin', isSelf: false }),
    ).toBe(true)
    expect(
      canChangeRole({ actorRole: 'admin', targetRole: 'member', nextRole: 'admin', isSelf: false }),
    ).toBe(false)
    expect(
      canChangeRole({ actorRole: 'owner', targetRole: 'member', nextRole: 'owner', isSelf: false }),
    ).toBe(false)
    expect(
      canChangeRole({ actorRole: 'owner', targetRole: 'admin', nextRole: 'admin', isSelf: false }),
    ).toBe(false)
    expect(
      canChangeRole({ actorRole: 'owner', targetRole: 'owner', nextRole: 'member', isSelf: true }),
    ).toBe(false)
  })
  it('removal: owner removes non-owners, admin removes members only, nobody removes self', () => {
    expect(canRemoveMember({ actorRole: 'owner', targetRole: 'admin', isSelf: false })).toBe(true)
    expect(canRemoveMember({ actorRole: 'admin', targetRole: 'member', isSelf: false })).toBe(true)
    expect(canRemoveMember({ actorRole: 'admin', targetRole: 'admin', isSelf: false })).toBe(false)
    expect(canRemoveMember({ actorRole: 'member', targetRole: 'member', isSelf: false })).toBe(
      false,
    )
    expect(canRemoveMember({ actorRole: 'owner', targetRole: 'owner', isSelf: true })).toBe(false)
  })
})
