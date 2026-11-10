import { emblemDefinition, type EmblemProgressView } from '@storix/shared'
import { tierColorStyle } from '@/features/members/member-copy'
import { earnedShort, isUpcoming } from '../emblem-copy'
import { EmblemIcon } from './emblem-icon'

interface EmblemTileProps {
  emblem: EmblemProgressView
  onOpen: () => void
}

/** One grid cell: coloured with its earned date, or greyed with a progress bar. */
export function EmblemTile({ emblem, onOpen }: EmblemTileProps) {
  const { name, tier } = emblemDefinition(emblem.id)
  const ratio = Math.min(1, emblem.progress / emblem.target)
  const status = emblem.isEarned
    ? earnedShort(emblem.earnedAt ?? new Date().toISOString())
    : isUpcoming(emblem)
      ? 'à venir'
      : `${emblem.progress} / ${emblem.target}`

  return (
    <button
      type="button"
      className={`emb${emblem.isEarned ? '' : ' off'}`}
      style={tierColorStyle(tier)}
      aria-label={`${name}, ${emblem.isEarned ? 'débloqué' : `verrouillé, ${status}`}`}
      onClick={onOpen}
    >
      <span className={`emb-hex${tier === 'mythic' && emblem.isEarned ? ' t-M' : ''}`}>
        <EmblemIcon id={emblem.id} className="emb-glyph" />
      </span>
      <b>{name}</b>
      {!emblem.isEarned && !isUpcoming(emblem) ? (
        <span className="emb-bar" aria-hidden="true">
          <i style={{ width: `${Math.round(ratio * 100)}%` }} />
        </span>
      ) : null}
      <small>{status}</small>
    </button>
  )
}
