import { useMemo, type CSSProperties } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import type { CollectionCard, SeriesDetail } from '@storix/shared'
import { Button, buttonClassName } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Icon } from '@/components/ui/icon'
import { CollectionGrid } from '@/features/cards/components/collection-grid'
import { cardsInfiniteQueryOptions, type CollectionFilters } from '@/features/cards/cards.queries'
import { NextThemeRow } from '@/features/series/components/next-theme-row'
import {
  isSeriesOpen,
  seriesDatesLabel,
  seriesKindLabel,
  seriesPercent,
} from '@/features/series/series-copy'
import { seriesDetailQueryOptions } from '@/features/series/series.queries'

export const Route = createFileRoute('/_authed/l/$leagueId/series/$seriesId')({
  loader: ({ context, params }) =>
    context.queryClient
      .ensureQueryData(seriesDetailQueryOptions(params.leagueId, params.seriesId))
      .catch(() => undefined),
  component: SeriesScreen,
})

const NO_NEW = new Set<string>()
const NOOP = (): void => undefined

function ProgressLine({ detail }: { detail: SeriesDetail }) {
  const { series } = detail
  if (isSeriesOpen(series)) {
    return (
      <div className="series-meta">
        <span>
          <b>{series.ownedCount}</b> possédées sur <b>{series.cardCount}</b> pour l&apos;instant
        </span>
        <em>en cours, le total bouge</em>
      </div>
    )
  }
  const missing = series.cardCount - series.ownedCount
  const isComplete = series.cardCount > 0 && missing === 0
  return (
    <>
      <div className="series-meta">
        <span>
          <b>
            {series.ownedCount} / {series.cardCount}
          </b>{' '}
          cartes
        </span>
        <em>
          {isComplete
            ? detail.isRewardEligible
              ? 'complète · emblème + 150 paillettes'
              : 'complète'
            : `il t'en manque ${missing}`}
        </em>
      </div>
      <span className="series-prog" aria-hidden="true">
        <i style={{ width: `${seriesPercent(series)}%` }} />
      </span>
    </>
  )
}

function SeriesScreen() {
  const { leagueId, seriesId } = Route.useParams()
  const detailQuery = useQuery(seriesDetailQueryOptions(leagueId, seriesId))
  const filters: CollectionFilters = {
    authorId: null,
    tier: null,
    upgradable: false,
    taggedUserId: null,
    seriesId,
    sort: 'number',
  }
  const cardsQuery = useInfiniteQuery(cardsInfiniteQueryOptions(leagueId, filters))
  const cards = useMemo<readonly CollectionCard[]>(
    () => (cardsQuery.data?.pages ?? []).flatMap((page) => page.cards),
    [cardsQuery.data],
  )
  const detail = detailQuery.data
  const back = (
    <Link to="/l/$leagueId/collection" params={{ leagueId }} className="series-back">
      <Icon name="back" className="size-4" />
      Collection
    </Link>
  )

  if (detail === undefined) {
    return (
      <main className="screen">
        {back}
        {detailQuery.isError ? (
          <EmptyState
            icon="collection"
            title="Série introuvable"
            body="Elle n'existe pas ou n'a pas encore commencé."
            action={
              <Button variant="ghost" onClick={() => void detailQuery.refetch()}>
                Réessayer
              </Button>
            }
          />
        ) : (
          <p className="m-0 text-sm text-muted">Chargement…</p>
        )}
      </main>
    )
  }

  const { series } = detail
  const isOpen = isSeriesOpen(series)
  return (
    <main className="screen">
      {back}
      <section className="series-head" style={{ '--sc': series.color } as CSSProperties}>
        <span className="series-head-em" aria-hidden="true">
          {series.emoji}
        </span>
        <h1>{series.title}</h1>
        <div className="series-meta">
          <span>{seriesKindLabel(series.kind)}</span>
          <em>{seriesDatesLabel(series)}</em>
        </div>
        <ProgressLine detail={detail} />
      </section>
      {detail.nextTheme ? (
        <NextThemeRow
          leagueId={leagueId}
          next={detail.nextTheme}
          canOverride={detail.canOverrideNextTheme}
        />
      ) : null}
      {series.cardCount === 0 ? (
        <EmptyState
          icon="collection"
          title="Pas encore de photo"
          body={
            isOpen ? 'Ajoute la première photo de cette série.' : 'Cette série est restée vide.'
          }
          action={
            isOpen && series.kind === 'theme' ? (
              <Link
                to="/l/$leagueId/add"
                params={{ leagueId }}
                search={{ theme: series.id }}
                className={buttonClassName({ variant: 'primary' })}
              >
                ＋ Ajouter
              </Link>
            ) : undefined
          }
        />
      ) : (
        <CollectionGrid
          leagueId={leagueId}
          cards={cards}
          isGrouped={false}
          newIds={NO_NEW}
          onOpenCard={NOOP}
          hasNextPage={cardsQuery.hasNextPage}
          isFetchingNextPage={cardsQuery.isFetchingNextPage}
          isFetchNextPageError={cardsQuery.isFetchNextPageError}
          fetchNextPage={cardsQuery.fetchNextPage}
        />
      )}
    </main>
  )
}
