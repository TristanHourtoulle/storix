import { useEffect } from 'react'
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { CARD_TIERS, type CardTier, type MemberSummary } from '@storix/shared'
import { Button, buttonClassName } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { Segmented } from '@/components/ui/segmented'
import { CollectionGrid } from '@/features/cards/components/collection-grid'
import { CollectionProgress } from '@/features/cards/components/collection-progress'
import { MemberFilter } from '@/features/cards/components/member-filter'
import { RarityFilter } from '@/features/cards/components/rarity-filter'
import { cardsInfiniteQueryOptions, type CollectionFilters } from '@/features/cards/cards.queries'
import { DustBalance } from '@/features/game/components/dust-balance'
import { useWallet } from '@/features/game/use-wallet'
import { membersQueryOptions } from '@/features/members/members.queries'

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
  const { author, tier, by, notice } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const members = useQuery(membersQueryOptions(leagueId)).data ?? NO_MEMBERS
  const { data: wallet } = useWallet(leagueId)
  const mode: FilterMode = by ?? 'member'
  const filters: CollectionFilters = { authorId: author ?? null, tier: tier ?? null }
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
      />
    </main>
  )
}

interface CollectionBodyProps {
  leagueId: string
  filters: CollectionFilters
  label: string
}

function CollectionBody({ leagueId, filters, label }: CollectionBodyProps) {
  const { data, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteQuery({
      ...cardsInfiniteQueryOptions(leagueId, filters),
      placeholderData: keepPreviousData,
    })
  const { authorId, tier } = filters
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [authorId, tier])

  if (!data) {
    return isError ? (
      <section role="alert" className="flex flex-col items-center gap-3 text-center">
        <p className="m-0 text-sm text-muted">Impossible de charger ta collection.</p>
        <Button variant="ghost" onClick={() => void refetch()}>
          Réessayer
        </Button>
      </section>
    ) : (
      LOADING
    )
  }
  const firstPage = data.pages[0]
  const cards = data.pages.flatMap((page) => page.cards)
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
      {owned === 0 && (
        <p className="m-0 text-sm text-muted">
          Ouvre un booster pour découvrir tes premières cartes.
        </p>
      )}
      <CollectionGrid
        leagueId={leagueId}
        cards={cards}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </>
  )
}
