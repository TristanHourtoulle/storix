import type { CSSProperties } from 'react'
import type { BoosterHistoryPull } from '@storix/shared'
import { CardImage } from '@/features/cards/components/card-image'
import { TIER_COLOR_VAR } from '@/features/cards/tier-labels'
import { useThumbhashUrl } from '@/features/cards/use-thumbhash-url'

const MINI_SIZES = '64px'

interface HistoryMiniCardProps {
  pull: BoosterHistoryPull
}

function LockedFill({ thumbhash }: { thumbhash: string }) {
  const placeholder = useThumbhashUrl(thumbhash)
  return (
    <span
      className="hmc-fill is-blurred"
      style={placeholder ? { backgroundImage: `url(${placeholder})` } : undefined}
    />
  )
}

/** A pulled card in miniature, ringed in its minted tier colour; removed cards show a neutral tile. */
export function HistoryMiniCard({ pull }: HistoryMiniCardProps) {
  const { card } = pull
  const classes = [
    'hmc',
    pull.variant === 'foil' ? 'is-foil' : '',
    card === null ? 'is-removed' : '',
  ]
  const style = { '--tc': TIER_COLOR_VAR[pull.tierAtMint] } as CSSProperties
  return (
    <span className={classes.filter(Boolean).join(' ')} style={style}>
      {card === null ? (
        <span className="hmc-removed">carte retirée</span>
      ) : card.kind === 'owned' ? (
        <CardImage
          image={card.image}
          thumbhash={card.thumbhash}
          width={card.width}
          height={card.height}
          sizes={MINI_SIZES}
        />
      ) : (
        <LockedFill thumbhash={card.thumbhash} />
      )}
      {pull.isDiscovery ? (
        <i className="hmc-new" aria-label="Découverte">
          N
        </i>
      ) : null}
    </span>
  )
}
