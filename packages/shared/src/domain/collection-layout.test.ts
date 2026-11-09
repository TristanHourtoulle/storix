import { describe, expect, it } from 'vitest'
import { buildCollectionRows, discoveryGroupOf, type DiscoveryGroup } from './collection-layout'

const now = new Date(2026, 10, 9, 10, 0).getTime()
const daysAgo = (days: number, hour = 10, minute = 0) =>
  new Date(2026, 10, 9 - days, hour, minute).getTime()

describe('discoveryGroupOf', () => {
  it('null is undiscovered', () => {
    expect(discoveryGroupOf(null, now)).toBe('undiscovered')
  })

  it('same local day earlier is today', () => {
    expect(discoveryGroupOf(new Date(2026, 10, 9, 0, 1).getTime(), now)).toBe('today')
  })

  it('a future date is today', () => {
    expect(discoveryGroupOf(daysAgo(-2), now)).toBe('today')
  })

  it('yesterday 23:59 is week, even when less than 24 hours have passed', () => {
    expect(discoveryGroupOf(daysAgo(1, 23, 59), now)).toBe('week')
  })

  it('7 days ago is week', () => {
    expect(discoveryGroupOf(daysAgo(7), now)).toBe('week')
  })

  it('8 days ago is month', () => {
    expect(discoveryGroupOf(daysAgo(8), now)).toBe('month')
  })

  it('31 days ago is month', () => {
    expect(discoveryGroupOf(daysAgo(31, 0, 0), now)).toBe('month')
  })

  it('32 days ago is earlier', () => {
    expect(discoveryGroupOf(daysAgo(32, 23, 59), now)).toBe('earlier')
  })
})

interface Item {
  id: string
  group: DiscoveryGroup
}

const items = (group: DiscoveryGroup, count: number, prefix: string): Item[] =>
  Array.from({ length: count }, (_, i) => ({ id: `${prefix}${String(i)}`, group }))

describe('buildCollectionRows', () => {
  it('chunks plain items by columns', () => {
    const rows = buildCollectionRows(items('today', 7, 'a'), 3, null)
    expect(rows.map((row) => (row.kind === 'items' ? row.items.length : 'header'))).toEqual([
      3, 3, 1,
    ])
  })

  it('puts a header before each group and chunks inside it', () => {
    const input = [
      ...items('today', 2, 't'),
      ...items('week', 4, 'w'),
      ...items('undiscovered', 1, 'u'),
    ]
    const rows = buildCollectionRows(input, 3, (item) => item.group)
    expect(
      rows.map((row) => (row.kind === 'header' ? `h:${row.group}` : row.items.length)),
    ).toEqual(['h:today', 2, 'h:week', 3, 1, 'h:undiscovered', 1])
    expect(rows[3]).toEqual({ kind: 'items', items: input.slice(2, 5), key: 'r:w0' })
  })

  it('returns no rows for no items', () => {
    expect(buildCollectionRows([], 3, (item: Item) => item.group)).toEqual([])
    expect(buildCollectionRows([], 3, null)).toEqual([])
  })

  it('gives every row a unique key', () => {
    const input = [...items('today', 5, 't'), ...items('earlier', 5, 'e')]
    const keys = buildCollectionRows(input, 2, (item) => item.group).map((row) => row.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('keys a repeated group by its run', () => {
    const input = [...items('week', 1, 'a'), ...items('today', 1, 'b'), ...items('week', 1, 'c')]
    const headers = buildCollectionRows(input, 3, (item) => item.group).filter(
      (row) => row.kind === 'header',
    )
    expect(headers.map((row) => row.key)).toEqual(['h:week:a0', 'h:today:b0', 'h:week:c0'])
  })
})
