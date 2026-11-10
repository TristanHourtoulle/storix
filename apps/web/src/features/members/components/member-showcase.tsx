import { Link } from '@tanstack/react-router'
import type { CollectionCard } from '@storix/shared'
import { CollectionCardView } from '@/features/cards/components/collection-card-view'

interface MemberShowcaseProps {
  leagueId: string
  cards: readonly CollectionCard[]
  isSelf: boolean
  isCustom: boolean
  onEdit: () => void
}

const SHOWCASE_SIZES = '(max-width: 480px) 31vw, 140px'

/** The six cards a member shows off; cards the viewer does not own stay blurred. */
export function MemberShowcase({ leagueId, cards, isSelf, isCustom, onEdit }: MemberShowcaseProps) {
  return (
    <section className="mpage-sec" aria-labelledby="mpage-showcase-title">
      <div className="mpage-sec-h">
        <h2 id="mpage-showcase-title">{isSelf ? 'Ta vitrine' : 'Sa vitrine'}</h2>
        {isSelf ? (
          <button type="button" className="mpage-edit" onClick={onEdit}>
            Modifier
          </button>
        ) : (
          <small>{isCustom ? `${cards.length} cartes choisies` : 'Choix automatique'}</small>
        )}
      </div>
      {cards.length === 0 ? (
        <p className="mpage-cnt">
          {isSelf ? 'Ouvre des boosters pour remplir ta vitrine.' : 'Aucune carte pour l’instant.'}
        </p>
      ) : (
        <ul className="mpage-vit">
          {cards.map((card) => (
            <li key={card.id}>
              <Link
                to="/l/$leagueId/cards/$cardId"
                params={{ leagueId, cardId: card.id }}
                className="relative block"
                aria-label={card.kind === 'owned' ? card.title : 'Carte à découvrir'}
              >
                <CollectionCardView card={card} size="md" sizes={SHOWCASE_SIZES} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
