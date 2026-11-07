import { Link, createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Icon } from '@/components/ui/icon'
import { Notice } from '@/components/ui/notice'
import { TopBar } from '@/components/ui/top-bar'
import { formatCardNumber } from '@/features/cards/card-number'
import { CardDetail } from '@/features/cards/components/card-detail'
import { LockedCardDetail } from '@/features/cards/components/locked-card-detail'
import { useCardMutations } from '@/features/cards/use-card-mutations'
import { useCardDetail } from '@/features/cards/use-card-detail'
import { DustBalance } from '@/features/game/components/dust-balance'
import { useWallet } from '@/features/game/use-wallet'

export const Route = createFileRoute('/_authed/l/$leagueId/cards/$cardId')({
  validateSearch: z.object({ author: z.string().optional() }),
  component: CardDetailScreen,
})

function CardDetailScreen() {
  const { leagueId, cardId } = Route.useParams()
  const { author } = Route.useSearch()
  const { card, isPending, isMissing, retry } = useCardDetail(leagueId, cardId)
  const { data: wallet } = useWallet(leagueId)
  const { craft } = useCardMutations(leagueId, cardId)

  return (
    <main className="screen">
      <TopBar
        title={card ? `Carte ${formatCardNumber(card.number)}` : 'Carte'}
        end={<DustBalance dust={wallet?.dust} />}
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
      {card?.kind === 'owned' ? (
        <CardDetail leagueId={leagueId} card={card} />
      ) : card ? (
        <>
          <LockedCardDetail
            card={card}
            dust={wallet?.dust}
            isBusy={craft.isPending}
            onCraft={() => craft.mutate()}
          />
          {craft.isError ? (
            <Notice tone="error">Fabrication impossible pour le moment. Réessaie.</Notice>
          ) : null}
        </>
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
            <Button variant="ghost" onClick={retry}>
              Réessayer
            </Button>
          }
        />
      )}
    </main>
  )
}
