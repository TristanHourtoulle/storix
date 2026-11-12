import { useQuery } from '@tanstack/react-query'
import type { CosmeticSlot } from '@storix/shared'
import { Avatar } from '@/components/ui/avatar'
import { meQueryOptions } from '@/features/auth/session.queries'
import { BoosterPack } from '@/features/game/components/booster-pack'
import { useEquippedStyle } from '../style-context'
import type { TryOnFace } from '../use-try-on-cards'
import { AuraDemo } from './aura-demo'
import { MemberBanner } from './member-banner'
import { SampleMomentFace } from './sample-card-face'
import { ScaledBox } from './scaled-box'
import { ShopCardBack } from './shop-card-back'
import { StyledName } from './styled-name'
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

function facePhotoUrls(faces: readonly TryOnFace[]): string[] {
  return faces.flatMap((face) => {
    if (face.kind !== 'card') return []
    const { card } = face
    if (card.kind !== 'owned' && card.kind !== 'unpulled') return []
    const smallest = card.image.webp.toSorted((a, b) => a.width - b.width)[0]
    return smallest === undefined ? [] : [smallest.url]
  })
}

function BannerPreview({ faces }: { faces: readonly TryOnFace[] }) {
  const me = useQuery(meQueryOptions).data
  const { banner, avatarFrame, nameStyle } = useEquippedStyle()
  const name = me?.user.displayUsername ?? ''
  return (
    <div className={`tryon-member${banner === null ? '' : ' mpage-hero'}`}>
      {banner === null ? (
        <div className="bn bn-original" aria-hidden="true" />
      ) : (
        <MemberBanner bannerId={banner} photoUrls={facePhotoUrls(faces)} />
      )}
      <div className="tryon-member-who">
        <Avatar label={name} portrait={me?.avatar ?? null} size="lg" frame={avatarFrame} />
        <StyledName styleId={nameStyle}>{name}</StyledName>
      </div>
    </div>
  )
}

function NamePreview() {
  const me = useQuery(meQueryOptions).data
  const { avatarFrame, nameStyle } = useEquippedStyle()
  const name = me?.user.displayUsername ?? ''
  return (
    <div className="tryon-feed">
      <div className="tryon-feed-row">
        <Avatar label={name} portrait={me?.avatar ?? null} size="compact" frame={avatarFrame} />
        <span>
          <b>
            <StyledName styleId={nameStyle}>{name}</StyledName>
          </b>{' '}
          a tiré une <b className="tryon-feed-tier">Légendaire</b>
        </span>
      </div>
      <div className="tryon-feed-row is-other">
        <Avatar label="Un membre" portrait={null} size="compact" frame={null} />
        <span>
          <b>Un membre</b> a ajouté 3 photos
        </span>
      </div>
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
    case 'banner':
      return <BannerPreview faces={faces} />
    case 'nameStyle':
      return <NamePreview />
    case 'momentStamp':
      return <SampleMomentFace size="lg" />
  }
}
