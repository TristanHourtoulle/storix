import { Suspense } from 'react'
import { useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { buttonClassName } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { CollectionGrid } from '@/features/cards/components/collection-grid'
import { MemberFilter } from '@/features/cards/components/member-filter'
import { cardsInfiniteQueryOptions } from '@/features/cards/cards.queries'
import { useMembers } from '@/features/members/use-members'
import { membersQueryOptions } from '@/features/members/members.queries'

export const Route = createFileRoute('/_authed/l/$leagueId/collection')({
  validateSearch: z.object({ author: z.string().optional() }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(membersQueryOptions(params.leagueId)),
  component: Collection,
})

const LOADING = <p className="m-0 text-sm text-muted">Chargement…</p>

function Collection() {
  const { leagueId } = Route.useParams()
  const { author } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const members = useMembers(leagueId)
  const authorId = author ?? null
  const authorName = members.find((member) => member.userId === authorId)?.displayUsername ?? null

  return (
    <main className="screen">
      <Suspense fallback={<h1>Collection</h1>}>
        <CollectionTitle leagueId={leagueId} authorId={authorId} />
      </Suspense>
      <MemberFilter
        members={members}
        selectedId={authorId}
        onSelect={(id) => void navigate({ search: { author: id ?? undefined }, replace: true })}
      />
      <Suspense fallback={LOADING}>
        <CollectionBody leagueId={leagueId} authorId={authorId} authorName={authorName} />
      </Suspense>
    </main>
  )
}

interface CollectionPartProps {
  leagueId: string
  authorId: string | null
}

function useTotal({ leagueId, authorId }: CollectionPartProps): number {
  const { data } = useSuspenseInfiniteQuery(cardsInfiniteQueryOptions(leagueId, authorId))
  return data.pages[0]?.total ?? 0
}

function CollectionTitle(props: CollectionPartProps) {
  const total = useTotal(props)
  return (
    <div className="flex items-baseline justify-between">
      <h1>Collection</h1>
      <span className="font-display text-[15px] font-semibold text-muted">
        <strong className="text-ink">{total}</strong> {total > 1 ? 'cartes' : 'carte'}
      </span>
    </div>
  )
}

function CollectionBody({
  leagueId,
  authorId,
  authorName,
}: CollectionPartProps & { authorName: string | null }) {
  const total = useTotal({ leagueId, authorId })

  return (
    <>
      <p className="m-0 font-display text-sm font-semibold text-ink-3">
        {authorName ? `Cartes de ${authorName} · ${total}` : `Toutes les cartes · ${total}`}
      </p>
      {total === 0 ? (
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
      ) : (
        <CollectionGrid leagueId={leagueId} authorId={authorId} />
      )}
    </>
  )
}
