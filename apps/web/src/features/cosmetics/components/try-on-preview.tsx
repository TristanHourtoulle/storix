import { useQuery } from '@tanstack/react-query'
import type { CosmeticSlot } from '@storix/shared'
import { Avatar } from '@/components/ui/avatar'
import { meQueryOptions } from '@/features/auth/session.queries'
import { BoosterPack } from '@/features/game/components/booster-pack'
import { useEquippedStyle } from '../style-context'
import type { TryOnFace } from '../use-try-on-cards'
import { AuraDemo } from './aura-demo'
import { ScaledBox } from './scaled-box'
import { ShopCardBack } from './shop-card-back'
import { TryOnFaceView } from './try-on-face'

const PACK_WIDTH = 112
const PACK_HEIGHT = 156

interface TryOnPreviewProps {
  slot: CosmeticSlot
  faces: readonly TryOnFace[]
}

function PacksPreview() {
  return (
    <div className="shop-pack-pair">
      <ScaledBox width={PACK_WIDTH} height={PACK_HEIGHT} scale={1.15}>
        <BoosterPack size="lg" />
      </ScaledBox>
      <ScaledBox width={PACK_WIDTH} height={PACK_HEIGHT} scale={1.3}>
        <BoosterPack size="lg" isPremium />
      </ScaledBox>
    </div>
  )
}

function AvatarPreview() {
  const me = useQuery(meQueryOptions).data
  const frame = useEquippedStyle().avatarFrame
  const name = me?.user.displayUsername ?? ''
  return (
    <div className="tryon-avatar">
      <Avatar label={name} portrait={me?.avatar ?? null} size="xl" frame={frame} />
      <b>{name}</b>
    </div>
  )
}

function AuraPreview({ faces }: { faces: readonly TryOnFace[] }) {
  const face = faces.at(-1)
  const tier = face?.kind === 'card' ? face.card.tier : (face?.tier ?? 'legendary')
  return (
    <AuraDemo isStage tier={tier}>
      {face ? <TryOnFaceView face={face} size="lg" /> : null}
    </AuraDemo>
  )
}

/** The cabin's stage for a slot, drawn with the real skinned components and the viewer's cards. */
export function TryOnPreview({ slot, faces }: TryOnPreviewProps) {
  switch (slot) {
    case 'booster':
      return <PacksPreview />
    case 'cardBack':
      return <ShopCardBack />
    case 'raritySet':
      return (
        <div className="tryon-grid">
          {faces.map((face) => (
            <TryOnFaceView key={face.key} face={face} size="md" />
          ))}
        </div>
      )
    case 'avatarFrame':
      return <AvatarPreview />
    case 'revealAura':
      return <AuraPreview faces={faces} />
  }
}
