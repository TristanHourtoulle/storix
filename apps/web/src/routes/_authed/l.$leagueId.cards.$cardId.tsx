import { Link, createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { EmptyState } from '@/components/ui/empty-state'
import { Icon } from '@/components/ui/icon'
import { TopBar } from '@/components/ui/top-bar'
import { formatCardNumber } from '@/features/cards/card-number'
import { CardDetail } from '@/features/cards/components/card-detail'
import { useCardDetail } from '@/features/cards/use-card-detail'

export const Route = createFileRoute('/_authed/l/$leagueId/cards/$cardId')({
  validateSearch: z.object({ author: z.string().optional() }),
  component: CardDetailScreen,
})

function CardDetailScreen() {
  const { leagueId, cardId } = Route.useParams()
  const { author } = Route.useSearch()
  const { card, isPending, isMissing, retry } = useCardDetail(leagueId, cardId)

  return (
    <main className="screen">
      <TopBar
        title={card ? `Carte ${formatCardNumber(card.number)}` : 'Carte'}
        start={
          <Link
            to="/l/$leagueId/collection"
            params={{ leagueId }}
            search={{ author }}
            aria-label="Retour à la collection"
            className="icon-btn"
          >
            <Icon name="back" className="size-5" />
          </Link>
        }
      />
      {card ? (
        <CardDetail card={card} />
      ) : isPending ? (
        <p className="m-0 text-sm text-muted">Chargement…</p>
      ) : isMissing ? (
        <EmptyState
          icon="collection"
          title="Carte introuvable"
          body="Cette carte n'existe pas ou n'est plus disponible."
        />
      ) : (
        <EmptyState
          icon="collection"
          title="Chargement impossible"
          body="Vérifie ta connexion puis réessaie."
          action={
            <button type="button" className="icon-btn px-4" onClick={retry}>
              Réessayer
            </button>
          }
        />
      )}
    </main>
  )
}
