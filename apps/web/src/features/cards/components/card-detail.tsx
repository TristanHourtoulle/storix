import type { CardDetail as CardDetailData } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { useHoloTilt } from '../use-holo-tilt'
import { TIER_LABELS } from '../tier-labels'
import { CardFace } from './card-face'
import { CardImage } from './card-image'

interface CardDetailProps {
  card: CardDetailData
}

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })

function formatDate(value: string | null, fallback: string): string {
  return value ? DATE_FORMAT.format(new Date(value)) : fallback
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta-cell">
      <p className="meta-k">{label}</p>
      <p className="meta-v">{value}</p>
    </div>
  )
}

export function CardDetail({ card }: CardDetailProps) {
  const { ref, needsMotionPermission, requestMotionPermission } = useHoloTilt()
  const isGold = card.tier === 'legendary' || card.tier === 'mythic'
  const tagged = card.tagged
    .flatMap((person) => (person.displayUsername ? [person.displayUsername] : []))
    .join(', ')

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="tilt" ref={ref}>
        <CardFace size="xl" title={card.title} tier={card.tier} isProvisional={card.isProvisional}>
          <CardImage
            image={card.image}
            thumbhash={card.thumbhash}
            width={card.width}
            height={card.height}
            sizes="236px"
            isEager
          />
        </CardFace>
      </div>
      <div className="pills">
        <span className={isGold ? 'pill gold' : 'pill'}>{TIER_LABELS[card.tier]}</span>
        {card.isProvisional ? <span className="pill">Provisoire</span> : null}
      </div>
      <h2 className="detail-name">{card.title}</h2>
      <div className="meta">
        <MetaCell label="Photo de" value={card.author.displayUsername ?? 'Ancien membre'} />
        <MetaCell label="Prise le" value={formatDate(card.capturedAt, 'Inconnue')} />
        <MetaCell label="Ajoutée le" value={formatDate(card.createdAt, 'Inconnue')} />
        <MetaCell label="Sur la photo" value={tagged || 'Personne'} />
      </div>
      {needsMotionPermission ? (
        <Button variant="ghost" onClick={() => void requestMotionPermission()}>
          Activer l'effet holo
        </Button>
      ) : null}
    </div>
  )
}
