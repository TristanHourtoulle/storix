import { useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { Button, buttonClassName } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { BoosterStage } from '@/features/boosters/components/booster-stage'
import { getOpeningErrorCode, useBoosterOpening } from '@/features/boosters/use-booster-opening'
import { boosterOpeningQueryOptions, walletQueryOptions } from '@/features/game/game.queries'

export const Route = createFileRoute('/_authed/l/$leagueId/booster')({
  validateSearch: z.object({ request: z.uuid().optional().catch(undefined) }),
  beforeLoad: async ({ context, params, search }) => {
    const home = { to: '/l/$leagueId', params, replace: true } as const
    if (!search.request) throw redirect(home)
    const { queryClient } = context
    const opening = boosterOpeningQueryOptions(params.leagueId, search.request)
    if (queryClient.getQueryData(opening.queryKey) !== undefined) return
    const wallet = await queryClient
      .fetchQuery({ ...walletQueryOptions(params.leagueId), staleTime: 0 })
      .catch(() => null)
    if (wallet?.pool.drawableCount === 0) throw redirect(home)
  },
  component: BoosterRoute,
})

function BackLink({ leagueId }: { leagueId: string }) {
  return (
    <Link to="/l/$leagueId" params={{ leagueId }} className={buttonClassName({ variant: 'ghost' })}>
      Retour
    </Link>
  )
}

function PoolEmptyHomeLink({ leagueId }: { leagueId: string }) {
  const queryClient = useQueryClient()
  return (
    <Link
      to="/l/$leagueId"
      params={{ leagueId }}
      replace
      className={buttonClassName({ variant: 'ghost' })}
      onClick={() =>
        void queryClient.invalidateQueries({ queryKey: walletQueryOptions(leagueId).queryKey })
      }
    >
      Retour
    </Link>
  )
}

function BoosterRoute() {
  const { leagueId } = Route.useParams()
  const { request } = Route.useSearch()
  if (!request) return null
  return <BoosterScreen leagueId={leagueId} requestId={request} />
}

function BoosterScreen({ leagueId, requestId }: { leagueId: string; requestId: string }) {
  const { data, error, isPending, refetch, isRefetching } = useBoosterOpening(leagueId, requestId)

  const errorCode = getOpeningErrorCode(error)
  let content
  if (data && data.pulls.length === 0) {
    content = (
      <main className="screen">
        <EmptyState
          icon="collection"
          title="Booster vide"
          body="Ce booster ne contient plus de cartes."
          action={<BackLink leagueId={leagueId} />}
        />
      </main>
    )
  } else if (data) {
    content = <BoosterStage key={data.id} leagueId={leagueId} opening={data} />
  } else if (isPending) {
    content = (
      <main className="screen min-h-dvh items-center justify-center" role="status">
        <p className="hint">Ouverture du booster…</p>
      </main>
    )
  } else if (errorCode === 'BOOSTER_STOCK_EMPTY') {
    content = (
      <main className="screen">
        <EmptyState
          icon="dust"
          title="Plus de booster"
          body="Ton stock est vide. Reviens quand le prochain sera prêt."
          action={<BackLink leagueId={leagueId} />}
        />
      </main>
    )
  } else if (errorCode === 'BOOSTER_POOL_EMPTY') {
    content = (
      <main className="screen">
        <EmptyState
          icon="collection"
          title="Aucune carte disponible"
          body="Les cartes sont trop récentes pour les boosters. Réessaie un peu plus tard."
          action={<PoolEmptyHomeLink leagueId={leagueId} />}
        />
      </main>
    )
  } else {
    content = (
      <main className="screen">
        <EmptyState
          icon="dust"
          title="Ouverture impossible"
          body="Une erreur est survenue. Réessaie, ton booster n'est pas perdu."
          action={
            <div className="flex gap-3">
              <Button variant="primary" isLoading={isRefetching} onClick={() => void refetch()}>
                Réessayer
              </Button>
              <BackLink leagueId={leagueId} />
            </div>
          }
        />
      </main>
    )
  }

  return content
}
