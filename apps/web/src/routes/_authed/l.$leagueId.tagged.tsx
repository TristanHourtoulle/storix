import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import type { TaggedCard } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Icon } from '@/components/ui/icon'
import { Notice } from '@/components/ui/notice'
import { TopBar } from '@/components/ui/top-bar'
import { TaggedCardList } from '@/features/withdrawals/components/tagged-card-list'
import { WithdrawCardDialog } from '@/features/withdrawals/components/withdraw-card-dialog'
import { useTaggedCards } from '@/features/withdrawals/use-tagged-cards'
import { useWithdrawCard } from '@/features/withdrawals/use-withdraw-card'

export const Route = createFileRoute('/_authed/l/$leagueId/tagged')({
  component: TaggedScreen,
})

function TaggedScreen() {
  const { leagueId } = Route.useParams()
  const { data: cards, isPending, isError, refetch } = useTaggedCards(leagueId)
  const withdraw = useWithdrawCard(leagueId)
  const [target, setTarget] = useState<TaggedCard | null>(null)

  return (
    <main className="screen">
      <TopBar
        title="Photos où tu apparais"
        start={
          <Link
            to="/l/$leagueId/profile"
            params={{ leagueId }}
            aria-label="Retour au profil"
            className="icon-btn"
          >
            <Icon name="back" className="size-5" />
          </Link>
        }
      />
      {cards && cards.length > 0 ? (
        <TaggedCardList cards={cards} onWithdraw={setTarget} />
      ) : cards ? (
        <EmptyState
          icon="profile"
          title="Aucune photo"
          body="Personne ne t'a identifié sur une photo pour l'instant."
        />
      ) : isPending ? (
        <p className="m-0 text-sm text-muted">Chargement…</p>
      ) : isError ? (
        <EmptyState
          icon="profile"
          title="Chargement impossible"
          body="Vérifie ta connexion puis réessaie."
          action={
            <Button variant="ghost" onClick={() => void refetch()}>
              Réessayer
            </Button>
          }
        />
      ) : null}
      {withdraw.isError ? (
        <Notice tone="error">Retrait impossible pour le moment. Réessaie.</Notice>
      ) : null}
      <WithdrawCardDialog
        number={target?.number ?? null}
        isPending={withdraw.isPending}
        onClose={() => setTarget(null)}
        onConfirm={() => {
          if (target) withdraw.mutate(target.id)
        }}
      />
    </main>
  )
}
