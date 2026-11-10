import { Button } from '@/components/ui/button'
import { CollectionGrid } from '@/features/cards/components/collection-grid'
import { useMemberCards, type MemberCardsScope } from '../use-member-cards'

interface MemberCardGridProps {
  leagueId: string
  scope: MemberCardsScope
  emptyLabel: string
  footer: (counts: { total: number; owned: number; unpulled: number }) => string
}

const NO_NEW = new Set<string>()
const noop = () => undefined

/** A member page tab listing cards with the Collection grid, plus a counts line under it. */
export function MemberCardGrid({ leagueId, scope, emptyLabel, footer }: MemberCardGridProps) {
  const query = useMemberCards(leagueId, scope)

  if (query.isError && !query.data) {
    return (
      <section role="alert" className="flex flex-col items-center gap-3 text-center">
        <p className="m-0 text-sm text-muted">Impossible de charger ces cartes.</p>
        <Button variant="ghost" onClick={() => void query.refetch()}>
          Réessayer
        </Button>
      </section>
    )
  }
  if (!query.data) return <p className="mpage-cnt">Chargement…</p>
  if (query.total === 0) return <p className="mpage-cnt">{emptyLabel}</p>

  const unpulled = query.cards.filter((card) => card.kind === 'unpulled').length

  return (
    <>
      <CollectionGrid
        leagueId={leagueId}
        cards={query.cards}
        isGrouped={false}
        newIds={NO_NEW}
        onOpenCard={noop}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        isFetchNextPageError={query.isFetchNextPageError}
        fetchNextPage={query.fetchNextPage}
      />
      <p className="mpage-cnt">{footer({ total: query.total, owned: query.owned, unpulled })}</p>
    </>
  )
}
