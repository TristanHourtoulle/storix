import { describe, expect, it } from 'vitest'
import { auditActionsIn, DEFAULT_AUDIT_CATEGORIES, groupAuditEntries } from './audit'

const MINUTE = 60_000
const NOW = new Date('2026-11-10T12:00:00Z').getTime()

describe('groupAuditEntries', () => {
  it('should merge failed codes for the same target within one hour', () => {
    const entries = groupAuditEntries([
      { id: 'a', action: 'reset_code.failed', targetUserId: 'lea', createdAt: new Date(NOW) },
      {
        id: 'b',
        action: 'reset_code.failed',
        targetUserId: 'lea',
        createdAt: new Date(NOW - 20 * MINUTE),
      },
      {
        id: 'c',
        action: 'member.joined',
        targetUserId: 'tom',
        createdAt: new Date(NOW - 30 * MINUTE),
      },
      {
        id: 'd',
        action: 'reset_code.failed',
        targetUserId: 'lea',
        createdAt: new Date(NOW - 90 * MINUTE),
      },
    ])
    expect(entries.map((entry) => [entry.id, entry.count])).toEqual([
      ['a', 2],
      ['c', 1],
      ['d', 1],
    ])
  })

  it('should exclude economy actions from the default categories', () => {
    const actions = auditActionsIn(DEFAULT_AUDIT_CATEGORIES)
    expect(actions).toContain('reset_code.failed')
    expect(actions).not.toContain('copy.promoted')
  })
})
