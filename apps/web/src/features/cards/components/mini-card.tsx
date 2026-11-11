import type { CSSProperties } from 'react'
import type { CardTier, CollectionCard } from '@storix/shared'
import { raritySetClass } from '@/features/cosmetics/cosmetic-skins'
import { DEFAULT_RARITY_PALETTE } from '@/features/cosmetics/rarity-palettes'
import { useEquippedStyle } from '@/features/cosmetics/style-context'
import { CardImage } from './card-image'
import { TIER_COLOR_VAR } from '../tier-labels'
import { useThumbhashUrl } from '../use-thumbhash-url'

interface MiniCardProps {
  card: CollectionCard | null
  tier: CardTier
  sizes: string
  isFoil?: boolean
  isDiscovery?: boolean
}

function BlurredFill({ thumbhash }: { thumbhash: string }) {
  const placeholder = useThumbhashUrl(thumbhash)
  return (
    <span
      className="hmc-fill is-blurred"
      style={placeholder ? { backgroundImage: `url(${placeholder})` } : undefined}
    />
  )
}

/** A card in miniature ringed in a tier colour, in the worn rarity set: its photo when visible, a blur when locked, a neutral tile once removed. */
export function MiniCard({
  card,
  tier,
  sizes,
  isFoil = false,
  isDiscovery = false,
}: MiniCardProps) {
  const raritySet = raritySetClass(useEquippedStyle().raritySet)
  const classes = ['hmc', raritySet, isFoil ? 'is-foil' : '', card === null ? 'is-removed' : '']
  const style = {
    '--tc': TIER_COLOR_VAR[tier],
    '--tc-deep': DEFAULT_RARITY_PALETTE.tiers[tier].deep,
  } as CSSProperties
  return (
    <span className={classes.filter(Boolean).join(' ')} style={style}>
      {card === null ? (
        <span className="hmc-removed">carte retirée</span>
      ) : card.kind === 'owned' || card.kind === 'unpulled' ? (
        <CardImage
          image={card.image}
          thumbhash={card.thumbhash}
          width={card.width}
          height={card.height}
          sizes={sizes}
        />
      ) : (
        <BlurredFill thumbhash={card.thumbhash} />
      )}
      {isDiscovery ? (
        <i className="hmc-new" aria-label="Découverte">
          N
        </i>
      ) : null}
    </span>
  )
}
