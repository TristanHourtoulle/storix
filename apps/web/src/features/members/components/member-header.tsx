import { emblemDefinition, type EmblemId, type MemberProfile } from '@storix/shared'
import { Avatar } from '@/components/ui/avatar'
import { EmblemIcon } from '@/features/emblems/components/emblem-icon'
import { joinedLabel, tierColorStyle } from '../member-copy'

interface MemberHeaderProps {
  header: MemberProfile['header']
  bestTier: MemberProfile['stats']['bestTier']
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
export function MemberHeader({ header, bestTier }: MemberHeaderProps) {
  return (
    <div className="mpage-head" style={tierColorStyle(bestTier)}>
      <span className={`mpage-av${bestTier === 'mythic' ? ' t-M' : ''}`}>
        <Avatar label={header.displayUsername} portrait={header.avatar} size="lg" />
      </span>
      <div className="min-w-0">
        <p className="mpage-name">{header.displayUsername}</p>
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
