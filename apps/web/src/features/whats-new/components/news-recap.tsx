import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { tierKey } from '@/features/boosters/arcade/tiers'
import { buttonClassName } from '@/components/ui/button'
import { TIER_LABELS } from '@/features/cards/tier-labels'
import { playSound } from '@/features/sound/sound'
import { featureCountLabel, type NewsCard, type NewsDeck } from '../news-deck'
import { formatReleaseLabel } from '../release-dates'
import { NewsCardFace } from './news-card-face'

interface NewsRecapProps {
  deck: NewsDeck
  mode: 'auto' | 'replay'
  renderTry: (card: NewsCard) => ReactNode
}

/** Booster-style recap of every feature card; tapping one shows it big again. */
export function NewsRecap({ deck, mode, renderTry }: NewsRecapProps) {
  const { cards, featureCount } = deck
  const [focus, setFocus] = useState<number | null>(null)
  const buttons = useRef(new Map<number, HTMLButtonElement>())
  const backRef = useRef<HTMLButtonElement>(null)
  const lastFocus = useRef<number | null>(null)
  const focused = focus === null ? undefined : cards[focus]
  const title = mode === 'auto' ? 'Tu es à jour' : formatReleaseLabel(deck.publishedAt)
  const subtitle =
    mode === 'auto'
      ? `${featureCountLabel(featureCount)} depuis ta dernière visite`
      : featureCountLabel(featureCount)

  useEffect(() => {
    if (focus !== null) {
      backRef.current?.focus()
      return
    }
    if (lastFocus.current === null) return
    buttons.current.get(lastFocus.current)?.focus()
    lastFocus.current = null
  }, [focus])

  function open(index: number): void {
    playSound({ name: 'newsFlip' })
    lastFocus.current = index
    setFocus(index)
  }

  if (focused) {
    return (
      <div className="ar-summary news-recap is-focus" data-t={tierKey(focused.tier)}>
        <div className="news-recap-big">
          <NewsCardFace card={focused} />
        </div>
        <p className="news-body">{focused.body}</p>
        {renderTry(focused)}
        <button
          ref={backRef}
          type="button"
          className={buttonClassName({ variant: 'ghost', block: true })}
          onClick={() => setFocus(null)}
        >
          Retour
        </button>
      </div>
    )
  }

  return (
    <div className="ar-summary news-recap">
      <div>
        <p className="ar-eyebrow">Nouveautés</p>
        <h2 className="ar-summary-title">{title}</h2>
        <p className="ar-summary-best">{subtitle}</p>
      </div>
      <ul className="ar-summary-grid">
        {cards.map((card, index) => (
          <li key={card.key}>
            <button
              ref={(node) => {
                if (node) buttons.current.set(index, node)
                else buttons.current.delete(index)
              }}
              type="button"
              className="ar-summary-item"
              data-t={tierKey(card.tier)}
              style={{ '--i': index } as CSSProperties}
              aria-label={`Revoir ${card.title}, ${TIER_LABELS[card.tier]}`}
              onClick={() => open(index)}
            >
              <div className="ar-summary-mini">
                <NewsCardFace card={card} />
              </div>
              <span className="ar-summary-name">{card.title}</span>
              <span className="ar-summary-tier">{TIER_LABELS[card.tier]}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
