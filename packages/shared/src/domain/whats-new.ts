export interface DatedRelease {
  id: string
  publishedAt: string
}

export interface ReleaseWithCards<C> extends DatedRelease {
  cards: readonly C[]
}

export interface ReadState {
  seenReleaseId: string | null
  seenAt: Date | null
  memberSince: Date
}

export interface NewsPack<C> {
  newestId: string
  newestPublishedAt: string
  cards: C[]
  overflowTitles: string[]
}

export interface ReleaseDay<R extends DatedRelease> {
  day: string
  releases: R[]
}

const RELEASE_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' })

const publishedAfter = (release: DatedRelease, date: Date): boolean =>
  new Date(release.publishedAt).getTime() > date.getTime()

const publishedAfterDay = (release: DatedRelease, date: Date): boolean =>
  RELEASE_DAY.format(new Date(release.publishedAt)) > RELEASE_DAY.format(date)

/**
 * Lists the ids of the releases a member has not seen yet, newest first.
 * Without a read row, releases published on or before the signup day (Paris time) count as seen.
 * Releases must be ordered newest first.
 */
export function unseenReleaseIds(
  releases: readonly DatedRelease[],
  { seenReleaseId, seenAt, memberSince }: ReadState,
): string[] {
  if (seenReleaseId !== null) {
    const seenIndex = releases.findIndex((release) => release.id === seenReleaseId)
    if (seenIndex >= 0) return releases.slice(0, seenIndex).map((release) => release.id)
    if (seenAt !== null) {
      return releases
        .filter((release) => publishedAfter(release, seenAt))
        .map((release) => release.id)
    }
  }
  return releases
    .filter((release) => publishedAfterDay(release, memberSince))
    .map((release) => release.id)
}

/** Tells whether `candidateId` is a known release newer than `currentId`. */
export function isNewerRelease(
  releases: readonly DatedRelease[],
  candidateId: string,
  currentId: string | null,
): boolean {
  const candidateIndex = releases.findIndex((release) => release.id === candidateId)
  if (candidateIndex < 0) return false
  if (currentId === null) return true
  const currentIndex = releases.findIndex((release) => release.id === currentId)
  return currentIndex < 0 || candidateIndex < currentIndex
}

/**
 * Merges releases (newest first) into one pack capped at `maxCards`;
 * the titles of the cards left out are returned newest first.
 */
export function buildNewsPack<C>(
  releases: readonly ReleaseWithCards<C>[],
  { maxCards, titleOf }: { maxCards: number; titleOf: (card: C) => string },
): NewsPack<C> | null {
  const newest = releases[0]
  if (newest === undefined) return null
  const allCards = releases.flatMap((release) => release.cards)
  return {
    newestId: newest.id,
    newestPublishedAt: newest.publishedAt,
    cards: allCards.slice(0, maxCards),
    overflowTitles: allCards.slice(maxCards).map(titleOf),
  }
}

/**
 * Groups releases (newest first) by their Paris publication day, keeping both the day order
 * and the release order within a day; `day` is an ISO date such as "2026-11-10".
 */
export function groupReleasesByDay<R extends DatedRelease>(
  releases: readonly R[],
): ReleaseDay<R>[] {
  return releases.reduce<ReleaseDay<R>[]>((days, release) => {
    const day = RELEASE_DAY.format(new Date(release.publishedAt))
    const last = days.at(-1)
    if (last?.day === day)
      return [...days.slice(0, -1), { day, releases: [...last.releases, release] }]
    return [...days, { day, releases: [release] }]
  }, [])
}
