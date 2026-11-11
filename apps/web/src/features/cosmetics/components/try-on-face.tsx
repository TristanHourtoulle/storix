import { CollectionCardView } from '@/features/cards/components/collection-card-view'
import type { TryOnFace } from '../use-try-on-cards'
import { SampleCardFace } from './sample-card-face'

interface TryOnFaceViewProps {
  face: TryOnFace
  size: 'md' | 'lg'
}

const IMAGE_SIZES = { md: '120px', lg: '220px' } as const

/** One face of the cabin: a card of the viewer's collection, or an example card. */
export function TryOnFaceView({ face, size }: TryOnFaceViewProps) {
  if (face.kind === 'sample') return <SampleCardFace tier={face.tier} size={size} />
  return <CollectionCardView card={face.card} size={size} sizes={IMAGE_SIZES[size]} isEager />
}
