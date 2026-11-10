import type { BoosterHistoryPull } from '@storix/shared'
import { MiniCard } from '@/features/cards/components/mini-card'

const MINI_SIZES = '64px'

interface HistoryMiniCardProps {
  pull: BoosterHistoryPull
}

/** A pulled card in miniature, ringed in its minted tier colour; removed cards show a neutral tile. */
export function HistoryMiniCard({ pull }: HistoryMiniCardProps) {
  return (
    <MiniCard
      card={pull.card}
      tier={pull.tierAtMint}
      sizes={MINI_SIZES}
      isFoil={pull.variant === 'foil'}
      isDiscovery={pull.isDiscovery}
    />
  )
}
