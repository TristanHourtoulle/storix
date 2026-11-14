import type { Database } from '@storix/db'
import {
  acceptsCards,
  daysLeft,
  hasRoleAtLeast,
  isRewardEligible,
  nextThemeWeekKey,
  rotationThemeFor,
  SERIES_SHELF_CLOSED_MAX,
  SERIES_THEME_CONTRIBUTORS,
  seriesColorFor,
  seriesPhase,
  THEME_ROTATION,
  themeWeekKey,
  type GoalContributor,
  type NextTheme,
  type SeriesDetail,
  type SeriesShelf,
  type SeriesSummary,
  type ThemeCard,
  type ThemeOverrideBody,
} from '@storix/shared'
import { AppError, forbidden, notFound } from '../../lib/errors'
import type { MediaSigner } from '../../lib/media-signer'
import { ORIGINAL_LOOK, findMemberLooks } from '../cosmetics/cosmetics.repository'
import type { Membership } from '../leagues/leagues.service'
import { listGoalPeople } from '../league-goal/league-goal.repository'
import { toPortraitView } from '../portraits/portrait-view'
import {
  attachCardToSeries,
  ensureThemeSeries,
  findCardForSeries,
  findThemeSeries,
  isRewarded,
  listSeriesContributions,
  listSeriesWithCounts,
  upsertThemeOverride,
  type SeriesContributionRow,
  type SeriesWithCounts,
} from './series.repository'

export interface SeriesService {
  getShelf(m: Membership): Promise<SeriesShelf>
  getThemeCard(m: Membership): Promise<ThemeCard>
  getSeries(m: Membership, seriesId: string): Promise<SeriesDetail>
  setNextTheme(m: Membership, body: ThemeOverrideBody): Promise<NextTheme>
  addCard(m: Membership, seriesId: string, cardId: string): Promise<void>
}

export interface SeriesServiceDeps {
  db: Database
  signer: MediaSigner
  clock: () => Date
}

function toSummary(row: SeriesWithCounts, now: Date): SeriesSummary {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    emoji: row.emoji,
    color: row.color,
    phase: seriesPhase(row, now),
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    graceEndsAt: row.graceEndsAt.toISOString(),
    cardCount: row.cardCount,
    ownedCount: row.ownedCount,
  }
}

function colorOf(title: string): string {
  const known = THEME_ROTATION.find(
    (idea) => idea.title.localeCompare(title, 'fr', { sensitivity: 'base' }) === 0,
  )
  return known?.color ?? seriesColorFor(title)
}

/** Builds the service for series: the collection shelf, the weekly theme and the series pages. */
export function createSeriesService({ db, signer, clock }: SeriesServiceDeps): SeriesService {
  async function loadOne(m: Membership, seriesId: string): Promise<SeriesWithCounts> {
    const [row] = await listSeriesWithCounts(db, {
      leagueId: m.leagueId,
      viewerId: m.userId,
      seriesId,
    })
    if (row === undefined) throw notFound('Series not found')
    return row
  }

  async function currentTheme(m: Membership, now: Date): Promise<SeriesWithCounts> {
    const theme = await ensureThemeSeries(db, { leagueId: m.leagueId, weekKey: themeWeekKey(now) })
    return loadOne(m, theme.id)
  }

  async function toContributors(
    leagueId: string,
    rows: readonly SeriesContributionRow[],
  ): Promise<GoalContributor[]> {
    const userIds = rows.map((row) => row.userId)
    const [people, looks] = await Promise.all([
      listGoalPeople(db, leagueId, userIds),
      findMemberLooks(db, userIds),
    ])
    const byId = new Map(people.map((person) => [person.userId, person]))
    return rows.flatMap((row) => {
      const person = byId.get(row.userId)
      if (person === undefined) return []
      const look = looks.get(row.userId) ?? ORIGINAL_LOOK
      return [
        {
          userId: row.userId,
          displayUsername: person.displayUsername,
          avatar:
            person.avatarUploadId === null || person.avatarColor === null
              ? null
              : toPortraitView(
                  {
                    kind: 'avatar',
                    ownerId: person.userId,
                    uploadId: person.avatarUploadId,
                    dominantColor: person.avatarColor,
                  },
                  signer,
                ),
          avatarFrame: look.avatarFrame,
          nameStyle: look.nameStyle,
          count: row.count,
        },
      ]
    })
  }

  async function nextThemeOf(
    m: Membership,
    series: SeriesWithCounts,
    now: Date,
  ): Promise<NextTheme | null> {
    if (series.kind !== 'theme' || series.weekKey !== themeWeekKey(now)) return null
    const weekKey = nextThemeWeekKey(series.weekKey)
    const planned = await findThemeSeries(db, { leagueId: m.leagueId, weekKey })
    if (planned !== null) {
      return {
        weekKey,
        title: planned.title,
        emoji: planned.emoji,
        color: planned.color,
        isOverride: planned.isOverride,
      }
    }
    return { weekKey, ...rotationThemeFor(m.leagueId, weekKey), isOverride: false }
  }

  return {
    async getShelf(m) {
      const now = clock()
      const rows = await listSeriesWithCounts(db, {
        leagueId: m.leagueId,
        viewerId: m.userId,
        withCardsOnly: true,
      })
      const summaries = rows
        .map((row) => toSummary(row, now))
        .filter((summary) => summary.phase !== 'upcoming')
      const live = summaries.filter((s) => s.phase === 'live' || s.phase === 'grace')
      const done = summaries
        .filter((s) => s.phase === 'closed')
        .slice(0, SERIES_SHELF_CLOSED_MAX)
      return {
        series: [
          ...live.toSorted((a, b) => Number(b.kind === 'theme') - Number(a.kind === 'theme')),
          ...done,
        ],
      }
    },

    async getThemeCard(m) {
      const now = clock()
      const theme = await currentTheme(m, now)
      const contributions = await listSeriesContributions(db, {
        leagueId: m.leagueId,
        seriesId: theme.id,
      })
      return {
        series: toSummary(theme, now),
        daysLeft: daysLeft(theme.endsAt, now),
        memberCount: contributions.length,
        contributors: await toContributors(
          m.leagueId,
          contributions.slice(0, SERIES_THEME_CONTRIBUTORS),
        ),
      }
    },

    async getSeries(m, seriesId) {
      const now = clock()
      const series = await loadOne(m, seriesId)
      const summary = toSummary(series, now)
      if (summary.phase === 'upcoming') throw notFound('Series not found')
      const [contributions, rewarded, nextTheme] = await Promise.all([
        listSeriesContributions(db, { leagueId: m.leagueId, seriesId }),
        isRewarded(db, { seriesId, userId: m.userId }),
        nextThemeOf(m, series, now),
      ])
      return {
        series: summary,
        memberCount: contributions.length,
        isRewardEligible: isRewardEligible({
          isClosed: summary.phase === 'closed',
          cardCount: series.cardCount,
        }),
        isRewarded: rewarded,
        nextTheme,
        canOverrideNextTheme: nextTheme !== null && hasRoleAtLeast(m.role, 'admin'),
      }
    },

    async setNextTheme(m, body) {
      if (!hasRoleAtLeast(m.role, 'admin')) throw forbidden('Only admins can set the theme')
      const now = clock()
      const weekKey = nextThemeWeekKey(themeWeekKey(now))
      const choice = { title: body.title, emoji: body.emoji, color: colorOf(body.title) }
      const isSet = await upsertThemeOverride(db, {
        leagueId: m.leagueId,
        weekKey,
        choice,
        userId: m.userId,
        now,
      })
      if (!isSet) throw new AppError('THEME_ALREADY_STARTED', 409, 'The theme already started')
      return { weekKey, ...choice, isOverride: true }
    },

    async addCard(m, seriesId, cardId) {
      const now = clock()
      const series = await loadOne(m, seriesId)
      if (!acceptsCards(series, now)) throw new AppError('SERIES_CLOSED', 409, 'Series closed')
      const card = await findCardForSeries(db, { leagueId: m.leagueId, cardId })
      if (card === null) throw notFound('Card not found')
      const isInWindow = card.createdAt >= series.startsAt && card.createdAt < series.endsAt
      if (card.authorId !== m.userId || card.status !== 'active' || !isInWindow) {
        throw new AppError('SERIES_CARD_NOT_ALLOWED', 403, 'This card cannot join the series')
      }
      await attachCardToSeries(db, { cardId, seriesIds: [seriesId], now })
    },
  }
}
