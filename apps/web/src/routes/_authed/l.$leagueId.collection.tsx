import { useCallback, useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import {
  CARD_TIERS,
  canPutNewFirst,
  collectionSortSchema,
  orderNewFirst,
  type CollectionCard,
  type CollectionSort,
  type MemberSummary,
  type OwnedCardSummary,
} from '@storix/shared'
import { Button, buttonClassName } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { CollectionGrid } from '@/features/cards/components/collection-grid'
import { CollectionProgress } from '@/features/cards/components/collection-progress'
import { CollectionToolbar } from '@/features/cards/components/collection-toolbar'
import { FilterSheet } from '@/features/cards/components/filter-sheet'
import { SortSheet } from '@/features/cards/components/sort-sheet'
import { cardsInfiniteQueryOptions, type CollectionFilters } from '@/features/cards/cards.queries'
import { collectionLabel, type CollectionFilterState } from '@/features/cards/collection-filters'
import { useCollectionNews } from '@/features/cards/news/use-collection-news'
import { useCollectionSort } from '@/features/cards/use-collection-sort'
import { DustBalance } from '@/features/game/components/dust-balance'
import { useWallet } from '@/features/game/use-wallet'
import { membersQueryOptions } from '@/features/members/members.queries'
import { DraftBanner } from '@/features/uploads/components/draft-banner'

export const Route = createFileRoute('/_authed/l/$leagueId/collection')({
  validateSearch: z.object({
    author: z.string().optional(),
    tier: z.enum(CARD_TIERS).optional(),
    hideLocked: z.boolean().optional(),
    sort: collectionSortSchema.optional(),
    notice: z.literal('withdrawn').optional(),
  }),
  loader: ({ context, params }) =>
    context.queryClient
      .ensureQueryData(membersQueryOptions(params.leagueId))
      .catch(() => undefined),
  component: Collection,
})

const NO_MEMBERS: MemberSummary[] = []

const LOADING = <p className="m-0 text-sm text-muted">Chargement…</p>

function Collection() {
  const { leagueId } = Route.useParams()
  const { author, tier, hideLocked, sort: urlSort, notice } = Route.useSearch()
  const { me } = Route.useRouteContext()
  const navigate = useNavigate({ from: Route.fullPath })
  const members = useQuery(membersQueryOptions(leagueId)).data ?? NO_MEMBERS
  const { data: wallet } = useWallet(leagueId)
  const { sort, pickSort } = useCollectionSort(me.user.id, leagueId, urlSort)
  const authorId = author ?? null
  const selectedTier = tier ?? null
  const filterState: CollectionFilterState = {
    authorId,
    tier: selectedTier,
    hideLocked: hideLocked ?? false,
  }
  const filters: CollectionFilters = { authorId, tier: selectedTier, sort }
  const news = useCollectionNews(me.user.id, leagueId)
  const visibleNew = useMemo(
    () =>
      news.newCards.filter(
        (card) =>
          (authorId === null || card.author.userId === authorId) &&
          (selectedTier === null || card.displayTier === selectedTier),
      ),
    [news.newCards, authorId, selectedTier],
  )

  const applyFilters = useCallback(
    (next: CollectionFilterState) => {
      void navigate({
        search: (prev) => ({
          ...prev,
          author: next.authorId ?? undefined,
          tier: next.tier ?? undefined,
          hideLocked: next.hideLocked || undefined,
        }),
        replace: true,
      })
    },
    [navigate],
  )

  return (
    <main className="screen">
      <div className="flex items-center justify-between gap-3">
        <h1>Collection</h1>
        <DustBalance dust={wallet?.dust} />
      </div>
      {notice ? <Notice tone="error">Cette carte a déjà été retirée.</Notice> : null}
      <DraftBanner leagueId={leagueId} />
      <CollectionBody
        leagueId={leagueId}
        filters={filters}
        filterState={filterState}
        members={members}
        onApplyFilters={applyFilters}
        label={collectionLabel(filterState, members)}
        onPickSort={pickSort}
        visibleNew={visibleNew}
        newIds={news.newIds}
        onMarkSeen={news.markSeen}
        onMarkAllSeen={news.markAll}
      />
    </main>
  )
}

interface CollectionBodyProps {
  leagueId: string
  filters: CollectionFilters
  filterState: CollectionFilterState
  members: readonly MemberSummary[]
  onApplyFilters: (filters: CollectionFilterState) => void
  label: string
  onPickSort: (sort: CollectionSort) => void
  visibleNew: OwnedCardSummary[]
  newIds: ReadonlySet<string>
  onMarkSeen: (cardId: string) => void
  onMarkAllSeen: () => void
}

function CollectionBody({
  leagueId,
  filters,
  filterState,
  members,
  onApplyFilters,
  label,
  onPickSort,
  visibleNew,
  newIds,
  onMarkSeen,
  onMarkAllSeen,
}: CollectionBodyProps) {
  const [isSortOpen, setIsSortOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const openFilters = useCallback(() => setIsFilterOpen(true), [])
  const [isNewFirst, setIsNewFirst] = useState(false)
  if (isNewFirst && visibleNew.length === 0) setIsNewFirst(false)
  const {
    data,
    isError,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
    isPlaceholderData,
  } = useInfiniteQuery({
    ...cardsInfiniteQueryOptions(leagueId, filters),
    placeholderData: keepPreviousData,
  })
  const { authorId, tier, sort } = filters
  const [settledSort, setSettledSort] = useState(sort)
  if (data && !isPlaceholderData && settledSort !== sort) setSettledSort(sort)
  const isOtherSortShown = isPlaceholderData && settledSort !== sort
  const canReorderNew = canPutNewFirst(sort)
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [authorId, tier, sort, filterState.hideLocked])
  const cards = useMemo(
    () => [
      ...new Map(
        (data?.pages ?? []).flatMap((page) => page.cards).map((card) => [card.id, card]),
      ).values(),
    ],
    [data],
  )
  const { hideLocked } = filterState
  const gridCards = useMemo<readonly CollectionCard[]>(() => {
    const shown = hideLocked ? cards.filter((card) => card.kind !== 'locked') : cards
    return isNewFirst ? orderNewFirst(shown, visibleNew, sort) : shown
  }, [hideLocked, isNewFirst, visibleNew, cards, sort])
  const openCard = useCallback(
    (card: CollectionCard) => {
      if (newIds.has(card.id)) onMarkSeen(card.id)
    },
    [newIds, onMarkSeen],
  )

  function toggleNewFirst() {
    setIsNewFirst((value) => !value)
    window.scrollTo({ top: 0 })
  }

  const sortControls = (
    <>
      <CollectionToolbar
        filters={filterState}
        members={members}
        onOpenFilters={openFilters}
        onChangeFilters={onApplyFilters}
        sort={sort}
        onOpenSort={() => setIsSortOpen(true)}
        newCount={visibleNew.length}
        isNewFirst={isNewFirst && canReorderNew}
        canReorderNew={canReorderNew}
        onToggleNewFirst={toggleNewFirst}
        onMarkAllSeen={onMarkAllSeen}
      />
      <SortSheet
        open={isSortOpen}
        value={sort}
        onPick={onPickSort}
        onClose={() => setIsSortOpen(false)}
      />
      <FilterSheet
        open={isFilterOpen}
        leagueId={leagueId}
        value={filterState}
        members={members}
        onApply={onApplyFilters}
        onClose={() => setIsFilterOpen(false)}
      />
    </>
  )

  if (!data) {
    return (
      <>
        {sortControls}
        {isError ? (
          <section role="alert" className="flex flex-col items-center gap-3 text-center">
            <p className="m-0 text-sm text-muted">Impossible de charger ta collection.</p>
            <Button variant="ghost" onClick={() => void refetch()}>
              Réessayer
            </Button>
          </section>
        ) : (
          LOADING
        )}
      </>
    )
  }
  const firstPage = data.pages[0]
  const total = firstPage?.total ?? 0
  const owned = firstPage?.ownedCount ?? 0
  const isFiltered = filterState.authorId !== null || filterState.tier !== null
  const isOwnedEmpty = hideLocked && gridCards.length === 0 && !hasNextPage

  if (total === 0) {
    return isFiltered ? (
      <>
        {sortControls}
        <p className="m-0 text-sm text-muted">Aucune carte ne correspond à ce filtre.</p>
      </>
    ) : (
      <EmptyState
        icon="collection"
        title="Aucune carte pour l'instant"
        body="Ajoute tes premières photos pour créer des cartes."
        action={
          <Link
            to="/l/$leagueId/add"
            params={{ leagueId }}
            className={buttonClassName({ variant: 'primary' })}
          >
            Ajouter des photos
          </Link>
        }
      />
    )
  }

  return (
    <>
      <CollectionProgress owned={owned} total={total} label={label} />
      {sortControls}
      {owned === 0 && !isOwnedEmpty && (
        <p className="m-0 text-sm text-muted">
          Ouvre un booster pour découvrir tes premières cartes.
        </p>
      )}
      {isOtherSortShown ? (
        LOADING
      ) : isOwnedEmpty ? (
        <p className="m-0 text-sm text-muted">Aucune carte possédée dans ce filtre.</p>
      ) : (
        <CollectionGrid
          leagueId={leagueId}
          cards={gridCards}
          isGrouped={sort === 'discovery'}
          newIds={newIds}
          onOpenCard={openCard}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          isFetchNextPageError={isFetchNextPageError}
          fetchNextPage={fetchNextPage}
        />
      )}
    </>
  )
}
