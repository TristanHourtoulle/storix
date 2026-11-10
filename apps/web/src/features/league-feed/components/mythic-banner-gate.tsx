import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { FeedHighlight } from '@storix/shared'
import { Icon } from '@/components/ui/icon'
import { MiniCard } from '@/features/cards/components/mini-card'
import { tierColorStyle } from '@/features/members/member-copy'
import { timeAgo } from '@/lib/paris-dates'
import { actorName, cardMention } from '../feed-copy'
import { useBravo } from '../use-bravo'
import { useMythicHighlights } from '../use-mythic-highlights'

interface MythicBannerGateProps {
  leagueId: string
  isSuspended: boolean
  onOpenChange?: (isOpen: boolean) => void
}

const SHOW_MS = 6500
const EXIT_MS = 450

/**
 * Announces a friend's Mythic ★ promotion once, as a floating copy of its big feed row with a Bravo.
 * Waits while the booster stage, onboarding, the whats-new booster, the passkey prompt or the emblem banner is open.
 */
export function MythicBannerGate({ leagueId, isSuspended, onOpenChange }: MythicBannerGateProps) {
  const navigate = useNavigate()
  const { highlights, markSeen, clear } = useMythicHighlights(leagueId)
  const { sendBravo } = useBravo(leagueId)
  const [current, setCurrent] = useState<FeedHighlight | null>(null)
  const [isShown, setIsShown] = useState(false)
  const first = highlights[0]
  const live =
    current === null
      ? null
      : (highlights.find((highlight) => highlight.eventId === current.eventId) ?? current)
  const currentId = current?.eventId ?? null

  if (current === null && !isSuspended && first !== undefined) setCurrent(first)

  const isOpen = currentId !== null
  useEffect(() => {
    onOpenChange?.(isOpen)
    return () => onOpenChange?.(false)
  }, [isOpen, onOpenChange])

  useEffect(() => {
    if (currentId === null) return undefined
    markSeen()
    const enter = window.requestAnimationFrame(() => setIsShown(true))
    const hide = window.setTimeout(() => setIsShown(false), SHOW_MS)
    const done = window.setTimeout(() => {
      clear()
      setCurrent(null)
    }, SHOW_MS + EXIT_MS)
    return () => {
      window.cancelAnimationFrame(enter)
      window.clearTimeout(hide)
      window.clearTimeout(done)
    }
  }, [currentId, markSeen, clear])

  if (live === null) return null
  const card = live.card
  return (
    <div className="mythic-banner-wrap" aria-live="polite">
      <div
        className={`feed-act is-big t-M mythic-banner${isShown ? ' is-shown' : ''}`}
        style={tierColorStyle('mythic')}
        aria-hidden={!isShown}
      >
        <span className="feed-ic">
          <Icon name="gem" className="feed-glyph" />
        </span>
        <span className="feed-txt">
          <button
            type="button"
            className="mythic-banner-main"
            tabIndex={isShown ? 0 : -1}
            onClick={() => {
              setIsShown(false)
              if (card !== null) {
                void navigate({
                  to: '/l/$leagueId/cards/$cardId',
                  params: { leagueId, cardId: card.id },
                })
              }
            }}
          >
            <b>{actorName(live.actor)}</b> a fait passer {cardMention(card)}{' '}
            <b className="tc">Mythique ★</b>
          </button>
          <small>{timeAgo(live.at)}</small>
          <button
            type="button"
            className="feed-clap"
            tabIndex={isShown ? 0 : -1}
            aria-pressed={live.hasBravoed}
            disabled={live.hasBravoed}
            onClick={() => sendBravo(live.eventId, live.bravoCount)}
          >
            <span aria-hidden="true">👏</span>
            <span>Bravo{live.bravoCount > 0 ? ` · ${live.bravoCount}` : ''}</span>
          </button>
        </span>
        <span className="feed-tail">
          {card !== null ? <MiniCard card={card} tier="mythic" sizes="48px" /> : null}
        </span>
      </div>
    </div>
  )
}
