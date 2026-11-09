import { useCallback, useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import {
  CARD_TIERS,
  COLLECTION_SORTS,
  canPutNewFirst,
  orderNewFirst,
  type CardTier,
  type CollectionCard,
  type CollectionSort,
  type MemberSummary,
  type OwnedCardSummary,
} from '@storix/shared'
import { Button, buttonClassName } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { Segmented } from '@/components/ui/segmented'
import { CollectionGrid } from '@/features/cards/components/collection-grid'
import { CollectionProgress } from '@/features/cards/components/collection-progress'
import { CollectionToolbar } from '@/features/cards/components/collection-toolbar'
import { MemberFilter } from '@/features/cards/components/member-filter'
import { RarityFilter } from '@/features/cards/components/rarity-filter'
import { SortSheet } from '@/features/cards/components/sort-sheet'
import { cardsInfiniteQueryOptions, type CollectionFilters } from '@/features/cards/cards.queries'
import { useCollectionNews } from '@/features/cards/news/use-collection-news'
import { useCollectionSort } from '@/features/cards/use-collection-sort'
import { DustBalance } from '@/features/game/components/dust-balance'
import { useWallet } from '@/features/game/use-wallet'
import { membersQueryOptions } from '@/features/members/members.queries'
import { DraftBanner } from '@/features/uploads/components/draft-banner'

type FilterMode = 'member' | 'rarity'

const FILTER_MODES = [
  { id: 'member', label: 'Par membre' },
  { id: 'rarity', label: 'Par rareté' },
] as const

export const Route = createFileRoute('/_authed/l/$leagueId/collection')({
  validateSearch: z.object({
    author: z.string().optional(),
    tier: z.enum(CARD_TIERS).optional(),
    by: z.enum(['member', 'rarity']).optional(),
    sort: z.enum(COLLECTION_SORTS).optional(),
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
  const { author, tier, by, sort: urlSort, notice } = Route.useSearch()
  const { me } = Route.useRouteContext()
  const navigate = useNavigate({ from: Route.fullPath })
  const members = useQuery(membersQueryOptions(leagueId)).data ?? NO_MEMBERS
  const { data: wallet } = useWallet(leagueId)
  const { sort, pickSort } = useCollectionSort(me.user.id, leagueId, urlSort)
  const mode: FilterMode = by ?? 'member'
  const filters: CollectionFilters = { authorId: author ?? null, tier: tier ?? null, sort }
  const news = useCollectionNews(me.user.id, leagueId)
  const visibleNew = useMemo(
    () =>
      news.newCards.filter(
        (card) =>
          (filters.authorId === null || card.author.userId === filters.authorId) &&
          (filters.tier === null || card.displayTier === filters.tier),
      ),
    [news.newCards, filters.authorId, filters.tier],
  )
  const authorName = members.find((member) => member.userId === filters.authorId)?.displayUsername

  function selectAuthor(id: string | null) {
    void navigate({ search: (prev) => ({ ...prev, author: id ?? undefined }), replace: true })
  }

  function selectTier(next: CardTier | null) {
    void navigate({ search: (prev) => ({ ...prev, tier: next ?? undefined }), replace: true })
  }

  function selectMode(next: FilterMode) {
    void navigate({ search: (prev) => ({ ...prev, by: next }), replace: true })
  }

  return (
    <main className="screen">
      <div className="flex items-center justify-between gap-3">
        <h1>Collection</h1>
        <DustBalance dust={wallet?.dust} />
      </div>
      {notice ? <Notice tone="error">Cette carte a déjà été retirée.</Notice> : null}
      <DraftBanner leagueId={leagueId} />
      <Segmented options={FILTER_MODES} value={mode} onChange={selectMode} />
      {mode === 'rarity' ? (
        <RarityFilter selected={filters.tier} onSelect={selectTier} />
      ) : (
        members.length > 0 && (
          <MemberFilter members={members} selectedId={filters.authorId} onSelect={selectAuthor} />
        )
      )}
      <CollectionBody
        leagueId={leagueId}
        filters={filters}
        label={authorName ? `Cartes de ${authorName}` : 'Toutes les cartes'}
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
  label,
  onPickSort,
  visibleNew,
  newIds,
  onMarkSeen,
  onMarkAllSeen,
}: CollectionBodyProps) {
  const [isSortOpen, setIsSortOpen] = useState(false)
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
  }, [authorId, tier, sort])
  const cards = useMemo(
    () => [
      ...new Map(
        (data?.pages ?? []).flatMap((page) => page.cards).map((card) => [card.id, card]),
      ).values(),
    ],
    [data],
  )
  const gridCards = useMemo<readonly CollectionCard[]>(
    () => (isNewFirst ? orderNewFirst(cards, visibleNew, sort) : cards),
    [isNewFirst, visibleNew, cards, sort],
  )
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
  const isFiltered = filters.authorId !== null || filters.tier !== null

  if (total === 0) {
    return isFiltered ? (
      <p className="m-0 text-sm text-muted">Aucune carte ne correspond à ce filtre.</p>
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
      {owned === 0 && (
        <p className="m-0 text-sm text-muted">
          Ouvre un booster pour découvrir tes premières cartes.
        </p>
      )}
      {isOtherSortShown ? (
        LOADING
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
