export const AUDIT_ACTIONS = [
  'league.created',
  'invitation.created',
  'invitation.revoked',
  'member.joined',
  'member.role_changed',
  'member.removed',
  'reset_code.issued',
  'reset_code.redeemed',
  'reset_code.failed',
  'card.created',
  'copy.recycled',
  'copy.crafted',
  'copy.foil_upgraded',
  'copy.promoted',
  'stack.converted',
  'league.settings_updated',
  'league.ownership_transferred',
  'league.deleted',
  'member.left',
  'card.hidden',
  'card.unhidden',
  'card.deleted',
  'card.withdrawn',
  'card.tier_pinned',
  'card.bounds_set',
  'card.capture_date_validated',
  'card.removed',
  'account.deleted',
  'league.renamed',
  'account.display_name_changed',
  'account.avatar_changed',
  'account.avatar_removed',
  'league.photo_changed',
  'league.photo_removed',
  'mission.claimed',
  'league_goal.reward_granted',
  'moment.posted',
  'cosmetic.purchased',
  'charm.purchased',
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const AUDIT_CATEGORIES = [
  'members',
  'cards',
  'settings',
  'security',
  'economy',
  'accounts',
] as const

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number]

export const DEFAULT_AUDIT_CATEGORIES: readonly AuditCategory[] = AUDIT_CATEGORIES.filter(
  (category) => category !== 'economy',
)

export const AUDIT_FAILED_CODE_WINDOW_MS = 3_600_000

const CATEGORY_BY_ACTION: Readonly<Record<AuditAction, AuditCategory>> = {
  'league.created': 'settings',
  'invitation.created': 'members',
  'invitation.revoked': 'members',
  'member.joined': 'members',
  'member.role_changed': 'members',
  'member.removed': 'members',
  'reset_code.issued': 'security',
  'reset_code.redeemed': 'security',
  'reset_code.failed': 'security',
  'card.created': 'cards',
  'copy.recycled': 'economy',
  'copy.crafted': 'economy',
  'copy.foil_upgraded': 'economy',
  'copy.promoted': 'economy',
  'stack.converted': 'economy',
  'league.settings_updated': 'settings',
  'league.ownership_transferred': 'members',
  'league.deleted': 'settings',
  'member.left': 'members',
  'card.hidden': 'cards',
  'card.unhidden': 'cards',
  'card.deleted': 'cards',
  'card.withdrawn': 'cards',
  'card.tier_pinned': 'cards',
  'card.bounds_set': 'cards',
  'card.capture_date_validated': 'cards',
  'card.removed': 'cards',
  'account.deleted': 'accounts',
  'league.renamed': 'settings',
  'account.display_name_changed': 'accounts',
  'account.avatar_changed': 'accounts',
  'account.avatar_removed': 'accounts',
  'league.photo_changed': 'settings',
  'league.photo_removed': 'settings',
  'mission.claimed': 'economy',
  'league_goal.reward_granted': 'economy',
  'moment.posted': 'economy',
  'cosmetic.purchased': 'economy',
  'charm.purchased': 'economy',
}

/** Returns the Journal category of an audit action. */
export function auditCategory(action: AuditAction): AuditCategory {
  return CATEGORY_BY_ACTION[action]
}

/** Lists the audit actions belonging to the given categories. */
export function auditActionsIn(categories: readonly AuditCategory[]): AuditAction[] {
  return AUDIT_ACTIONS.filter((action) => categories.includes(auditCategory(action)))
}

export interface AuditEntryInput {
  id: string
  action: AuditAction
  targetUserId: string | null
  createdAt: Date
}

export type GroupedAuditEntry<T extends AuditEntryInput> = T & { count: number; times: Date[] }

/**
 * Merges failed reset codes for the same target within one hour into a single entry, newest first.
 * Entries must be ordered newest first; other entries pass through with a count of 1.
 */
export function groupAuditEntries<T extends AuditEntryInput>(
  entries: readonly T[],
  windowMs: number = AUDIT_FAILED_CODE_WINDOW_MS,
): GroupedAuditEntry<T>[] {
  const { grouped } = entries.reduce<{
    grouped: GroupedAuditEntry<T>[]
    open: ReadonlyMap<string, number>
  }>(
    (acc, entry) => {
      if (entry.action !== 'reset_code.failed') {
        return {
          grouped: [...acc.grouped, { ...entry, count: 1, times: [entry.createdAt] }],
          open: acc.open,
        }
      }
      const key = entry.targetUserId ?? ''
      const openIndex = acc.open.get(key)
      const open = openIndex === undefined ? undefined : acc.grouped[openIndex]
      if (
        open !== undefined &&
        openIndex !== undefined &&
        open.createdAt.getTime() - entry.createdAt.getTime() <= windowMs
      ) {
        const merged = { ...open, count: open.count + 1, times: [...open.times, entry.createdAt] }
        return { grouped: acc.grouped.with(openIndex, merged), open: acc.open }
      }
      const grouped = [...acc.grouped, { ...entry, count: 1, times: [entry.createdAt] }]
      return { grouped, open: new Map(acc.open).set(key, grouped.length - 1) }
    },
    { grouped: [], open: new Map() },
  )
  return grouped
}
