import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { emblemDefinition, type FeedRow as FeedRowData, type Portrait } from '@storix/shared'
import { Avatar } from '@/components/ui/avatar'
import { Icon } from '@/components/ui/icon'
import { EmblemIcon } from '@/features/emblems/components/emblem-icon'
import { MiniCard } from '@/features/cards/components/mini-card'
import { TIER_CLASS, TIER_LABELS } from '@/features/cards/tier-labels'
import { countOf, tierColorStyle } from '@/features/members/member-copy'
import { timeAgo } from '@/lib/paris-dates'
import { actorName, actorsLabel, cardMention, isBigRow, rowIcon, rowTier } from '../feed-copy'

const MINI_SIZES = '40px'

interface FeedRowProps {
  leagueId: string
  row: FeedRowData
  meId: string
  avatars: ReadonlyMap<string, Portrait>
  onBravo: (eventId: string, bravoCount: number) => void
}

function Tier({ row }: { row: FeedRowData }) {
  const tier = rowTier(row)
  if (tier === null) return null
  return (
    <b className="tc">
      {TIER_LABELS[tier]}
      {row.kind === 'card_promoted' ? ' ★' : ''}
    </b>
  )
}

function Aggregate({ count }: { count: number }) {
  return count > 1 ? <span className="feed-aggr">×{count}</span> : null
}

function sentence(row: FeedRowData): ReactNode {
  const who = <b>{actorsLabel(row.actors)}</b>
  const isPlural = row.actors.length > 1
  switch (row.kind) {
    case 'booster_opened':
      return (
        <>
          {who} {isPlural ? 'ont' : 'a'} ouvert {countOf(row.count, 'booster', 'boosters')}
          {row.isPremium ? ' dont un premium' : ''}
        </>
      )
    case 'card_pulled':
      return row.count > 1 ? (
        <>
          {who} a tiré {row.count} cartes, dont une <Tier row={row} />
          <Aggregate count={row.count} />
        </>
      ) : (
        <>
          {who} a tiré une <Tier row={row} />
          {row.isPremium ? ' dans un booster premium' : ''}
        </>
      )
    case 'card_published':
      return (
        <>
          {who} a ajouté {row.count > 1 ? `${row.count} photos` : 'une photo'} à la pioche
          <Aggregate count={row.count} />
        </>
      )
    case 'card_promoted':
      return (
        <>
          {who} a fait passer {cardMention(row.card)} <Tier row={row} />
        </>
      )
    case 'card_foiled':
      return row.count > 1 ? (
        <>
          {who} a passé {row.count} cartes en <b className="tc">foil</b>
          <Aggregate count={row.count} />
        </>
      ) : (
        <>
          {who} a passé {cardMention(row.card)} en <b className="tc">foil</b>
        </>
      )
    case 'emblem_unlocked':
      return row.count > 1 || row.emblemId === null ? (
        <>
          {who} a débloqué {countOf(row.count, 'emblème', 'emblèmes')}
          <Aggregate count={row.count} />
        </>
      ) : (
        <>
          {who} a débloqué l&apos;emblème{' '}
          <b className="tc">{emblemDefinition(row.emblemId).name}</b>
        </>
      )
    case 'member_joined':
      return <>{who} a rejoint la ligue</>
    case 'card_tier_reached':
      return (
        <>
          {cardMention(row.card).replace(/^une/, 'Une')} est devenue <Tier row={row} />
        </>
      )
  }
}

function details(row: FeedRowData): string {
  const parts = [timeAgo(row.at)]
  if (row.kind === 'card_pulled' && row.isDiscovery) parts.push('découverte')
  if (row.kind === 'booster_opened' && row.tier !== null) {
    parts.push(`meilleure carte : ${TIER_LABELS[row.tier]}`)
  }
  if (row.kind === 'card_promoted' && row.fromTier !== null) {
    parts.push(`depuis ${TIER_LABELS[row.fromTier]}`)
  }
  return parts.join(' · ')
}

function RowIcon({ row, avatars }: Pick<FeedRowProps, 'row' | 'avatars'>) {
  if (row.kind === 'member_joined') {
    const actor = row.actors[0]
    const userId = actor?.userId ?? null
    return (
      <span className="feed-ic is-avatar">
        <Avatar
          label={actor ? actorName(actor) : 'Ancien membre'}
          portrait={userId === null ? null : (avatars.get(userId) ?? null)}
          size="compact"
        />
      </span>
    )
  }
  if (row.kind === 'emblem_unlocked' && row.emblemId !== null) {
    return (
      <span className="feed-ic">
        <EmblemIcon id={row.emblemId} className="feed-glyph" />
      </span>
    )
  }
  return (
    <span className="feed-ic">
      <Icon name={rowIcon(row)} className="feed-glyph" />
    </span>
  )
}

function RowLink({
  leagueId,
  row,
  children,
}: Pick<FeedRowProps, 'leagueId' | 'row'> & { children: ReactNode }) {
  const userId = row.actors[0]?.userId ?? null
  if (row.kind === 'member_joined' || row.kind === 'emblem_unlocked') {
    if (userId === null) return <span>{children}</span>
    return (
      <Link
        to="/l/$leagueId/members/$userId"
        params={{ leagueId, userId }}
        search={row.kind === 'emblem_unlocked' ? { tab: 'emblems' } : {}}
        className="feed-link"
      >
        {children}
      </Link>
    )
  }
  if (row.card === null) return <span>{children}</span>
  return (
    <Link
      to="/l/$leagueId/cards/$cardId"
      params={{ leagueId, cardId: row.card.id }}
      className="feed-link"
    >
      {children}
    </Link>
  )
}

/** One feed sentence: who did what, when, with the card in miniature and a Bravo on promotions. */
export function FeedRow({ leagueId, row, meId, avatars, onBravo }: FeedRowProps) {
  const tier = rowTier(row)
  const classes = [
    'feed-act',
    isBigRow(row) ? 'is-big' : '',
    tier === 'mythic' && isBigRow(row) ? TIER_CLASS.mythic : '',
  ]
  const isOwn = row.actors.some((actor) => actor.userId === meId)
  const canBravo = row.kind === 'card_promoted' && !isOwn
  const showsBravo = row.kind === 'card_promoted' && (canBravo || row.bravoCount > 0)

  return (
    <div className={classes.filter(Boolean).join(' ')} style={tierColorStyle(tier)}>
      <RowIcon row={row} avatars={avatars} />
      <span className="feed-txt">
        <RowLink leagueId={leagueId} row={row}>
          {sentence(row)}
        </RowLink>
        <small>{details(row)}</small>
        {showsBravo ? (
          <button
            type="button"
            className="feed-clap"
            aria-pressed={row.hasBravoed}
            disabled={!canBravo || row.hasBravoed}
            onClick={() => onBravo(row.id, row.bravoCount)}
          >
            <span aria-hidden="true">👏</span>
            <span>Bravo{row.bravoCount > 0 ? ` · ${row.bravoCount}` : ''}</span>
          </button>
        ) : null}
      </span>
      <span className="feed-tail">
        {row.card !== null ? (
          <MiniCard
            card={row.card}
            tier={tier ?? row.card.tier}
            sizes={MINI_SIZES}
            isFoil={row.kind === 'card_foiled'}
          />
        ) : null}
      </span>
    </div>
  )
}
