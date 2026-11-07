import { useState } from 'react'
import { Notice } from '@/components/ui/notice'
import { useAdminCards } from '../use-admin-cards'
import { useCardModeration } from '../use-card-moderation'
import type { AdminFilter } from '../moderation.types'
import { AdminCardList } from './admin-card-list'
import { AdminCardSheet } from './admin-card-sheet'

interface AdminCardsPanelProps {
  leagueId: string
}

export function AdminCardsPanel({ leagueId }: AdminCardsPanelProps) {
  const [filter, setFilter] = useState<AdminFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const list = useAdminCards(leagueId, filter)
  const moderation = useCardModeration(leagueId)
  const selected = list.cards.find((card) => card.id === selectedId) ?? null

  if (list.isLoading) return <p className="m-0 text-sm text-muted">Chargement…</p>
  if (list.isError) return <Notice tone="error">Impossible de charger les cartes.</Notice>

  return (
    <section aria-label="Cartes" className="flex flex-col gap-3">
      <AdminCardList
        cards={list.cards}
        outOfBoosterIds={list.outOfBoosterIds}
        filter={filter}
        onFilterChange={setFilter}
        onSelect={setSelectedId}
        onLoadMore={list.fetchNextPage}
        hasMore={list.hasNextPage}
        isLoadingMore={list.isFetchingNextPage}
      />
      <AdminCardSheet
        card={selected}
        mythicCount={list.mythicCount}
        moderation={moderation}
        onClose={() => {
          setSelectedId(null)
          moderation.setVisibility.reset()
          moderation.pinTier.reset()
          moderation.setBounds.reset()
          moderation.validateDate.reset()
        }}
      />
    </section>
  )
}
