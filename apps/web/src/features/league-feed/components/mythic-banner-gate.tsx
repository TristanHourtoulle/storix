import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { FeedHighlight } from '@storix/shared'
import { MiniCard } from '@/features/cards/components/mini-card'
import { tierColorStyle } from '@/features/members/member-copy'
import { actorName, cardMention } from '../feed-copy'
import { useBravo } from '../use-bravo'
import { useMythicHighlights } from '../use-mythic-highlights'

interface MythicBannerGateProps {
  leagueId: string
  isSuspended: boolean
}

const SHOW_MS = 6500
const EXIT_MS = 450

/**
 * Announces a friend's Mythic ★ promotion with a top banner and a Bravo, once per promotion.
 * Waits while the booster stage, onboarding, the whats-new booster or another banner is open.
 */
export function MythicBannerGate({ leagueId, isSuspended }: MythicBannerGateProps) {
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
        className={`mythic-banner${isShown ? ' is-shown' : ''}`}
        style={tierColorStyle('mythic')}
        aria-hidden={!isShown}
      >
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
          {card !== null ? (
            <span className="mythic-banner-card t-M">
              <MiniCard card={card} tier="mythic" sizes="26px" />
            </span>
          ) : null}
          <span className="min-w-0 text-left">
            <b>{actorName(live.actor)}</b> a fait passer {cardMention(card)}{' '}
            <b className="tc">Mythique ★</b>
          </span>
        </button>
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
      </div>
    </div>
  )
}
