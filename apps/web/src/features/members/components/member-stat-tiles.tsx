import type { MemberProfile } from '@storix/shared'
import { TIER_LABELS } from '@/features/cards/tier-labels'
import { pluralOf, TIER_SHORT_LABELS, tierColorStyle } from '../member-copy'

interface MemberStatTilesProps {
  stats: MemberProfile['stats']
}

/** Four tiles: photos posted, cards owned (with completion on your own page), discoveries, best rarity. */
export function MemberStatTiles({ stats }: MemberStatTilesProps) {
  const cardsNoun = pluralOf(stats.cardsOwned, 'carte', 'cartes')
  const cardsLabel =
    stats.completionPercent === undefined
      ? cardsNoun
      : `${cardsNoun} · ${stats.completionPercent} %`

  return (
    <dl className="mpage-stats">
      <div className="mpage-stat">
        <dt>{pluralOf(stats.photosPosted, 'photo', 'photos')}</dt>
        <dd>{stats.photosPosted}</dd>
      </div>
      <div className="mpage-stat">
        <dt>{cardsLabel}</dt>
        <dd>{stats.cardsOwned}</dd>
      </div>
      <div className="mpage-stat">
        <dt>{pluralOf(stats.discoveries, 'découverte', 'découvertes')}</dt>
        <dd>{stats.discoveries}</dd>
      </div>
      <div className="mpage-stat">
        <dt>meilleure</dt>
        {stats.bestTier ? (
          <dd className="is-tier" style={tierColorStyle(stats.bestTier)}>
            <span aria-hidden="true">{TIER_SHORT_LABELS[stats.bestTier]}</span>
            <span className="sr-only">{TIER_LABELS[stats.bestTier]}</span>
          </dd>
        ) : (
          <dd>–</dd>
        )}
      </div>
    </dl>
  )
}
