import { emblemDefinition, type EmblemId, type MemberProfile } from '@storix/shared'
import { Avatar } from '@/components/ui/avatar'
import { MemberBanner } from '@/features/cosmetics/components/member-banner'
import { StyledName } from '@/features/cosmetics/components/styled-name'
import { useEquippedStyle } from '@/features/cosmetics/style-context'
import { EmblemIcon } from '@/features/emblems/components/emblem-icon'
import { joinedLabel, tierColorStyle } from '../member-copy'

interface MemberHeaderProps {
  header: MemberProfile['header']
  bestTier: MemberProfile['stats']['bestTier']
  photoUrls: readonly string[]
}

function FeaturedEmblem({ id }: { id: EmblemId }) {
  const { name, tier } = emblemDefinition(id)
  return (
    <span
      className={`mpage-eb${tier === 'mythic' ? ' t-M' : ''}`}
      style={tierColorStyle(tier)}
      title={name}
    >
      <EmblemIcon id={id} className="size-3.5" />
      <span className="sr-only">{name}</span>
    </span>
  )
}

/** Member page header: avatar ringed with their best card's colour, join date, featured emblems. */
export function MemberHeader({ header, bestTier, photoUrls }: MemberHeaderProps) {
  const worn = useEquippedStyle()
  const banner = header.isSelf ? worn.banner : header.banner
  const nameStyle = header.isSelf ? worn.nameStyle : header.nameStyle
  const frame = header.isSelf ? worn.avatarFrame : header.avatarFrame
  return (
    <div className={banner === null ? undefined : 'mpage-hero'}>
      <MemberBanner bannerId={banner} photoUrls={photoUrls} />
      <MemberHeadRow header={header} bestTier={bestTier} frame={frame} nameStyle={nameStyle} />
    </div>
  )
}

function MemberHeadRow({
  header,
  bestTier,
  frame,
  nameStyle,
}: Omit<MemberHeaderProps, 'photoUrls'> & {
  frame: MemberProfile['header']['avatarFrame']
  nameStyle: MemberProfile['header']['nameStyle']
}) {
  return (
    <div className="mpage-head" style={tierColorStyle(bestTier)}>
      <span className={`mpage-av${bestTier === 'mythic' ? ' t-M' : ''}`}>
        <Avatar label={header.displayUsername} portrait={header.avatar} frame={frame} size="lg" />
      </span>
      <div className="min-w-0">
        <p className="mpage-name">
          <StyledName styleId={nameStyle}>{header.displayUsername}</StyledName>
        </p>
        <p className="mpage-since">{joinedLabel(header.joinedAt)}</p>
        {header.featuredEmblems.length > 0 ? (
          <div className="mpage-ebs" aria-label="Emblèmes mis en avant">
            {header.featuredEmblems.map((id) => (
              <FeaturedEmblem key={id} id={id} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
