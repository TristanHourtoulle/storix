import type { CSSProperties, ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  emblemDefinition,
  type CosmeticItemId,
  type EmblemId,
  type FeedRow as FeedRowData,
  type Portrait,
} from '@storix/shared'
import { Avatar } from '@/components/ui/avatar'
import { Icon } from '@/components/ui/icon'
import { StyledName } from '@/features/cosmetics/components/styled-name'
import { EmblemIcon } from '@/features/emblems/components/emblem-icon'
import { MiniCard } from '@/features/cards/components/mini-card'
import { TIER_CLASS, TIER_LABELS } from '@/features/cards/tier-labels'
import { countOf, tierColorStyle } from '@/features/members/member-copy'
import { timeAgo } from '@/lib/paris-dates'
import {
  actorName,
  actorsSummary,
  cardMention,
  goalAmount,
  isBigRow,
  leadEmblem,
  rowIcon,
  rowTier,
} from '../feed-copy'

const MINI_SIZES = '48px'
const THUMB_SIZES = '26px'
const NAMED_EMBLEMS = 2
const GOAL_TONE = { '--tc': 'var(--color-cyan-soft)' } as CSSProperties
const GOAL_KINDS: ReadonlySet<FeedRowData['kind']> = new Set([
  'league_goal_reached',
  'league_goal_bonus',
  'league_goal_missed',
])

interface FeedRowProps {
  leagueId: string
  row: FeedRowData
  meId: string
  avatars: ReadonlyMap<string, Portrait>
  frames: ReadonlyMap<string, CosmeticItemId>
  nameStyles: ReadonlyMap<string, CosmeticItemId>
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

function EmblemName({ id }: { id: EmblemId }) {
  const definition = emblemDefinition(id)
  return (
    <b className="tc" style={tierColorStyle(definition.tier)}>
      {definition.name}
    </b>
  )
}

function EmblemNames({ ids }: { ids: readonly EmblemId[] }) {
  const named = ids.slice(0, NAMED_EMBLEMS)
  const rest = ids.length - named.length
  return (
    <>
      {named.map((id, index) => (
        <span key={id}>
          {index === 0 ? '' : rest === 0 && index === named.length - 1 ? ' et ' : ', '}
          <EmblemName id={id} />
        </span>
      ))}
      {rest > 0 ? ` et ${countOf(rest, 'autre', 'autres')}` : ''}
    </>
  )
}

function Who({
  actors,
  nameStyles,
}: {
  actors: FeedRowData['actors']
  nameStyles: ReadonlyMap<string, CosmeticItemId>
}) {
  const { named, rest } = actorsSummary(actors)
  const separator = (index: number) => {
    if (index === 0) return ''
    return rest === 0 && index === named.length - 1 ? ' et ' : ', '
  }
  return (
    <b>
      {named.map((actor, index) => (
        <span key={actor.userId ?? `former-${index}`}>
          {separator(index)}
          <StyledName
            styleId={actor.userId === null ? null : (nameStyles.get(actor.userId) ?? null)}
          >
            {actorName(actor)}
          </StyledName>
        </span>
      ))}
      {rest > 0 ? ` et ${rest} autres` : ''}
    </b>
  )
}

function sentence(row: FeedRowData, nameStyles: ReadonlyMap<string, CosmeticItemId>): ReactNode {
  const who = <Who actors={row.actors} nameStyles={nameStyles} />
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
          {who} a tiré {row.count} cartes
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
        </>
      ) : (
        <>
          {who} a passé {cardMention(row.card)} en <b className="tc">foil</b>
        </>
      )
    case 'emblem_unlocked':
      return row.emblemIds.length > 1 ? (
        <>
          {who} a débloqué les emblèmes <EmblemNames ids={row.emblemIds} />
        </>
      ) : row.emblemIds[0] === undefined ? (
        <>
          {who} a débloqué {countOf(row.count, 'emblème', 'emblèmes')}
        </>
      ) : (
        <>
          {who} a débloqué l&apos;emblème <EmblemName id={row.emblemIds[0]} />
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
    case 'missions_week_completed':
      return (
        <>
          {who} {isPlural ? 'ont bouclé leurs' : 'a bouclé ses'} missions de la semaine
        </>
      )
    case 'league_goal_reached':
      return (
        <>
          <b>Objectif atteint</b>
          {row.goal === null ? '' : ` · ${goalAmount(row.goal.type, row.goal.target)}`} · +2
          boosters pour tous
        </>
      )
    case 'league_goal_bonus':
      return (
        <>
          <b>Palier bonus</b> · +1 premium
        </>
      )
    case 'league_goal_missed':
      return row.goal === null ? (
        <b>Objectif manqué</b>
      ) : (
        <>
          <b>Objectif manqué</b> de{' '}
          {goalAmount(row.goal.type, Math.max(1, row.goal.target - row.goal.progress))}
        </>
      )
  }
}

function details(row: FeedRowData): string {
  const parts = [timeAgo(row.at)]
  if (row.kind === 'card_pulled' && row.count === 1 && row.isDiscovery) parts.push('découverte')
  if ((row.kind === 'booster_opened' || row.kind === 'card_pulled') && row.count > 1) {
    if (row.tier !== null) parts.push(`meilleure carte : ${TIER_LABELS[row.tier]}`)
  } else if (row.kind === 'booster_opened' && row.tier !== null) {
    parts.push(`meilleure carte : ${TIER_LABELS[row.tier]}`)
  }
  if (row.kind === 'card_promoted' && row.fromTier !== null) {
    parts.push(`depuis ${TIER_LABELS[row.fromTier]}`)
  }
  return parts.join(' · ')
}

function RowIcon({ row, avatars, frames }: Pick<FeedRowProps, 'row' | 'avatars' | 'frames'>) {
  if (row.kind === 'member_joined') {
    const actor = row.actors[0]
    const userId = actor?.userId ?? null
    return (
      <span className="feed-ic is-avatar">
        <Avatar
          label={actor ? actorName(actor) : 'Ancien membre'}
          portrait={userId === null ? null : (avatars.get(userId) ?? null)}
          frame={userId === null ? null : (frames.get(userId) ?? null)}
          size="compact"
          isTinted
        />
      </span>
    )
  }
  const emblemId = leadEmblem(row.emblemIds)
  if (row.kind === 'emblem_unlocked' && emblemId !== null) {
    return (
      <span className="feed-ic">
        <EmblemIcon id={emblemId} className="feed-glyph" />
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

function RowTail({ row, tier }: { row: FeedRowData; tier: ReturnType<typeof rowTier> }) {
  if (row.kind === 'card_published' && row.thumbs.length > 1) {
    return (
      <span className="feed-thumbs">
        {row.thumbs.map((card) => (
          <MiniCard key={card.id} card={card} tier={card.tier} sizes={THUMB_SIZES} />
        ))}
      </span>
    )
  }
  if (row.card === null) return <span />
  return (
    <span className="feed-tail">
      <MiniCard
        card={row.card}
        tier={tier ?? row.card.tier}
        sizes={MINI_SIZES}
        isFoil={row.kind === 'card_foiled'}
      />
    </span>
  )
}

/** One feed sentence: who did what, when, with the card in miniature and a Bravo on promotions. */
export function FeedRow({
  leagueId,
  row,
  meId,
  avatars,
  frames,
  nameStyles,
  onBravo,
}: FeedRowProps) {
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
    <div
      className={classes.filter(Boolean).join(' ')}
      style={GOAL_KINDS.has(row.kind) ? GOAL_TONE : tierColorStyle(tier)}
    >
      <RowIcon row={row} avatars={avatars} frames={frames} />
      <span className="feed-txt">
        <RowLink leagueId={leagueId} row={row}>
          {sentence(row, nameStyles)}
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
      <RowTail row={row} tier={tier} />
    </div>
  )
}
