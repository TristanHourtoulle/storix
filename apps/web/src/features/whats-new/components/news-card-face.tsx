import { CardFace, type CardFaceProps } from '@/features/cards/components/card-face'
import type { NewsCard } from '../news-deck'
import { NewsIllustration } from './news-illustrations'

interface NewsCardFaceProps {
  card: NewsCard
  size?: CardFaceProps['size']
}

/** A feature presented as a collectible card: its illustration as art, its title in the band. */
export function NewsCardFace({ card, size = 'lg' }: NewsCardFaceProps) {
  return (
    <CardFace size={size} title={card.title} tier={card.tier} isProvisional={false}>
      <NewsIllustration name={card.illustration} />
    </CardFace>
  )
}
