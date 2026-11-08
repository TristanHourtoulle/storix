export const LEAGUE_ROLES = ['owner', 'admin', 'member'] as const

export type LeagueRole = (typeof LEAGUE_ROLES)[number]

const ROLE_RANK: Record<LeagueRole, number> = { owner: 2, admin: 1, member: 0 }

/** Returns true when `role` ranks at or above `min`. */
export function hasRoleAtLeast(role: LeagueRole, min: LeagueRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min]
}

/** Returns true when the role may create and revoke invitations. */
export function canManageInvitations(role: LeagueRole): boolean {
  return hasRoleAtLeast(role, 'admin')
}

/** Returns true when the role may set, replace or remove the league photo. */
export function canManageLeaguePhoto(role: LeagueRole): boolean {
  return hasRoleAtLeast(role, 'admin')
}

/** Returns true when the actor may move the target to `nextRole`; only the owner, never on self, the owner, to owner or to the same role. */
export function canChangeRole(input: {
  actorRole: LeagueRole
  targetRole: LeagueRole
  nextRole: LeagueRole
  isSelf: boolean
}): boolean {
  return (
    input.actorRole === 'owner' &&
    !input.isSelf &&
    input.targetRole !== 'owner' &&
    input.nextRole !== 'owner' &&
    input.nextRole !== input.targetRole
  )
}

/** Returns true when the actor may remove the target from the league. */
export function canRemoveMember(input: {
  actorRole: LeagueRole
  targetRole: LeagueRole
  isSelf: boolean
}): boolean {
  if (input.isSelf || input.targetRole === 'owner') return false
  if (input.actorRole === 'owner') return true
  return input.actorRole === 'admin' && input.targetRole === 'member'
}
