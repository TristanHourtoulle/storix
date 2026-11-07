import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { AdminCard } from '@storix/shared'
import { Notice } from '@/components/ui/notice'
import { useAdminCards } from '../use-admin-cards'
import { adminCardsRootKey } from '../moderation.queries'
import { useCardModeration } from '../use-card-moderation'
import type { AdminFilter } from '../moderation.types'
import { AdminCardList } from './admin-card-list'
import { AdminCardSheet } from './admin-card-sheet'

interface AdminCardsPanelProps {
  leagueId: string
}

export function AdminCardsPanel({ leagueId }: AdminCardsPanelProps) {
  const [filter, setFilter] = useState<AdminFilter>('all')
  const [selected, setSelected] = useState<AdminCard | null>(null)
  const queryClient = useQueryClient()
  const list = useAdminCards(leagueId, filter)
  const moderation = useCardModeration(leagueId, (card) =>
    setSelected((current) => (current?.id === card.id ? card : current)),
  )

  if (list.isLoading) return <p className="m-0 text-sm text-muted">Chargement…</p>
  if (list.isError) return <Notice tone="error">Impossible de charger les cartes.</Notice>

  return (
    <section aria-label="Cartes" className="flex flex-col gap-3">
      <AdminCardList
        cards={list.cards}
        outOfBoosterIds={list.outOfBoosterIds}
        filter={filter}
        onFilterChange={setFilter}
        onSelect={setSelected}
        onLoadMore={list.fetchNextPage}
        hasMore={list.hasNextPage}
        isLoadingMore={list.isFetchingNextPage}
      />
      <AdminCardSheet
        card={selected}
        mythicCount={list.mythicCount}
        moderation={moderation}
        onClose={() => {
          setSelected(null)
          void queryClient.invalidateQueries({ queryKey: adminCardsRootKey(leagueId) })
          moderation.setVisibility.reset()
          moderation.pinTier.reset()
          moderation.setBounds.reset()
          moderation.validateDate.reset()
        }}
      />
    </section>
  )
}
