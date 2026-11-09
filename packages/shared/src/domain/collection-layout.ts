import type { CollectionSort } from './collection-cursor'

export const DISCOVERY_GROUPS = ['today', 'week', 'month', 'earlier', 'undiscovered'] as const

export type DiscoveryGroup = (typeof DISCOVERY_GROUPS)[number]

const DAY_MS = 86_400_000

const WEEK_DAYS = 7

const MONTH_DAYS = 31

export type CollectionGridRow<T, G> =
  { kind: 'header'; group: G; key: string } | { kind: 'items'; items: readonly T[]; key: string }

function localDayNumber(epochMs: number): number {
  const date = new Date(epochMs)
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS
}

/**
 * Buckets a discovery date (epoch ms) by local calendar days before `now`: the same day or later is
 * today, 1 to 7 days is this week, 8 to 31 days is this month, older is earlier, and no date is
 * undiscovered.
 */
export function discoveryGroupOf(discoveredAt: number | null, now: number): DiscoveryGroup {
  if (discoveredAt === null) return 'undiscovered'
  const days = localDayNumber(now) - localDayNumber(discoveredAt)
  if (days <= 0) return 'today'
  if (days <= WEEK_DAYS) return 'week'
  if (days <= MONTH_DAYS) return 'month'
  return 'earlier'
}

function chunk<T extends { id: string }, G>(
  items: readonly T[],
  columns: number,
): CollectionGridRow<T, G>[] {
  return Array.from({ length: Math.ceil(items.length / columns) }, (_, index) => {
    const rowItems = items.slice(index * columns, (index + 1) * columns)
    return { kind: 'items', items: rowItems, key: `r:${rowItems[0]?.id ?? String(index)}` }
  })
}

/**
 * Lays out grid rows of `columns` items. With `groupOf`, each run of consecutive items of one group
 * starts with a header row keyed by the run's first item, and its items are chunked on their own.
 */
export function buildCollectionRows<T extends { id: string }, G extends string>(
  items: readonly T[],
  columns: number,
  groupOf: ((item: T) => G) | null,
): CollectionGridRow<T, G>[] {
  const width = Math.max(1, Math.floor(columns))
  if (groupOf === null) return chunk<T, G>(items, width)
  const groups = items.map(groupOf)
  const starts = groups.flatMap((group, index) =>
    index === 0 || group !== groups[index - 1] ? [index] : [],
  )
  return starts.flatMap((start, index): CollectionGridRow<T, G>[] => {
    const group = groups[start]
    const first = items[start]
    if (group === undefined || first === undefined) return []
    const segment = items.slice(start, starts[index + 1] ?? items.length)
    return [
      { kind: 'header', group, key: `h:${group}:${first.id}` },
      ...chunk<T, G>(segment, width),
    ]
  })
}

/** True when the « nouvelles » chip may move new cards first: Découverte already leads with them. */
export function canPutNewFirst(sort: CollectionSort): boolean {
  return sort !== 'discovery'
}

/**
 * Puts the new items first, in their own order, then the other items, unless the sort already leads
 * with the latest discoveries, in which case the items are returned as they are.
 */
export function orderNewFirst<T extends { id: string }>(
  items: readonly T[],
  newItems: readonly T[],
  sort: CollectionSort,
): readonly T[] {
  if (!canPutNewFirst(sort) || newItems.length === 0) return items
  const newIds = new Set(newItems.map((item) => item.id))
  return [...newItems, ...items.filter((item) => !newIds.has(item.id))]
}
