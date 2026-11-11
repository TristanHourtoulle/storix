import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { CardTier, CosmeticItemId, CosmeticSlot } from '@storix/shared'
import { Avatar } from '@/components/ui/avatar'
import { meQueryOptions } from '@/features/auth/session.queries'
import { BoosterPack } from '@/features/game/components/booster-pack'
import { StylePreview, useEquippedStyle } from '../style-context'
import { AuraDemo } from './aura-demo'
import { SampleCardFace } from './sample-card-face'
import { ScaledBox } from './scaled-box'
import { CARD_BACK_HEIGHT, CARD_BACK_WIDTH, ShopCardBack } from './shop-card-back'

const PACK_WIDTH = 84
const PACK_HEIGHT = 117

type ThumbVariant = 'row' | 'slot' | 'sheet'

interface ItemThumbProps {
  slot: CosmeticSlot
  itemId: CosmeticItemId | null
  variant: ThumbVariant
}

const PACK_SCALES: Readonly<Record<ThumbVariant, readonly number[]>> = {
  row: [40 / PACK_WIDTH, 44 / PACK_WIDTH],
  slot: [34 / PACK_WIDTH],
  sheet: [112 / PACK_WIDTH, 124 / PACK_WIDTH],
}

const BACK_WIDTH: Readonly<Record<ThumbVariant, number>> = { row: 40, slot: 34, sheet: 118 }

const RARITY_TIERS: Readonly<Record<ThumbVariant, readonly CardTier[]>> = {
  row: ['common', 'rare', 'legendary'],
  slot: ['rare', 'legendary'],
  sheet: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'],
}

const AVATAR_SIZE = { row: 'md', slot: 'compact', sheet: 'xl' } as const

const AURA_WIDTH: Readonly<Record<ThumbVariant, number>> = { row: 30, slot: 24, sheet: 70 }

function PackThumb({ variant }: { variant: ThumbVariant }) {
  return (
    <div className="flex items-end gap-1">
      {PACK_SCALES[variant].map((scale, index) => (
        <ScaledBox key={scale} width={PACK_WIDTH} height={PACK_HEIGHT} scale={scale}>
          <BoosterPack size="md" isPremium={index === 1} />
        </ScaledBox>
      ))}
    </div>
  )
}

function AvatarThumb({ variant }: { variant: ThumbVariant }) {
  const me = useQuery(meQueryOptions).data
  const frame = useEquippedStyle().avatarFrame
  return (
    <Avatar
      label={me?.user.displayUsername ?? ''}
      portrait={me?.avatar ?? null}
      size={AVATAR_SIZE[variant]}
      frame={frame}
    />
  )
}

function ThumbContent({ slot, variant }: { slot: CosmeticSlot; variant: ThumbVariant }) {
  switch (slot) {
    case 'booster':
      return <PackThumb variant={variant} />
    case 'cardBack': {
      const scale = BACK_WIDTH[variant] / CARD_BACK_WIDTH
      return (
        <ScaledBox width={CARD_BACK_WIDTH} height={CARD_BACK_HEIGHT} scale={scale}>
          <ShopCardBack />
        </ScaledBox>
      )
    }
    case 'raritySet':
      return (
        <div className={variant === 'sheet' ? 'shop-sheet-rarity' : 'shop-mini-rarity'}>
          {RARITY_TIERS[variant].map((tier) => (
            <SampleCardFace key={tier} tier={tier} size="sm" />
          ))}
        </div>
      )
    case 'avatarFrame':
      return <AvatarThumb variant={variant} />
    case 'revealAura':
      return <AuraDemo width={AURA_WIDTH[variant]} />
  }
}

/** A small preview of a theme of a slot, drawn with the real skinned components. */
export function ItemThumb({ slot, itemId, variant }: ItemThumbProps) {
  const override = useMemo(() => ({ [slot]: itemId }), [slot, itemId])
  return (
    <StylePreview override={override}>
      <ThumbContent slot={slot} variant={variant} />
    </StylePreview>
  )
}
