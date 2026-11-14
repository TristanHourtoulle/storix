import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Icon } from '@/components/ui/icon'
import { TopBar } from '@/components/ui/top-bar'
import { formatCardNumber } from '@/features/cards/card-number'
import { CardDetail } from '@/features/cards/components/card-detail'
import { HiddenCardDetail } from '@/features/cards/components/hidden-card-detail'
import { LockedCardDetail } from '@/features/cards/components/locked-card-detail'
import { useCardDetail } from '@/features/cards/use-card-detail'
import { DustBalance } from '@/features/game/components/dust-balance'
import { useWallet } from '@/features/game/use-wallet'
import { WithdrawCardDialog } from '@/features/withdrawals/components/withdraw-card-dialog'
import { isCardGone, useWithdrawCard } from '@/features/withdrawals/use-withdraw-card'

export const Route = createFileRoute('/_authed/l/$leagueId/cards/$cardId')({
  validateSearch: z.object({ author: z.string().optional() }),
  component: CardDetailScreen,
})

function CardDetailScreen() {
  const { leagueId, cardId } = Route.useParams()
  const { me } = Route.useRouteContext()
  const { author } = Route.useSearch()
  const { card, isPending, isMissing, retry } = useCardDetail(leagueId, cardId)
  const { data: wallet } = useWallet(leagueId)
  const withdraw = useWithdrawCard(leagueId, true)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const openWithdraw = () => {
    withdraw.reset()
    setIsWithdrawing(true)
  }
  const closeWithdraw = () => setIsWithdrawing(false)

  return (
    <main className="screen flex-1">
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
        <CardDetail leagueId={leagueId} card={card} meId={me.user.id} onWithdraw={openWithdraw} />
      ) : card?.kind === 'hidden' ? (
        <HiddenCardDetail card={card} onWithdraw={openWithdraw} />
      ) : card ? (
        <LockedCardDetail
          leagueId={leagueId}
          card={card}
          meId={me.user.id}
          onWithdraw={openWithdraw}
        />
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
      <WithdrawCardDialog
        number={isWithdrawing && card && !isCardGone(withdraw.error) ? card.number : null}
        isPending={withdraw.isPending}
        hasError={withdraw.isError}
        onClose={closeWithdraw}
        onConfirm={() => withdraw.mutate(cardId)}
      />
    </main>
  )
}
