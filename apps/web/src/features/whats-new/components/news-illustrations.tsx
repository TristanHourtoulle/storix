import type { NewsCard } from '../news-deck'
import { CameraIllustration } from './illustrations/camera-illustration'
import { ShareIllustration } from './illustrations/share-illustration'
import { ShowcaseIllustration } from './illustrations/showcase-illustration'
import { SortIllustration } from './illustrations/sort-illustration'
import { StacksIllustration } from './illustrations/stacks-illustration'

interface NewsIllustrationProps {
  name: NewsCard['illustration']
  isLive: boolean
}

function More() {
  return (
    <svg className="news-more" viewBox="0 0 100 100">
      <rect className="ni-line is-0" x="24" y="32" width="52" height="6" rx="3" />
      <rect className="ni-line is-1" x="24" y="47" width="40" height="6" rx="3" />
      <rect className="ni-line is-2" x="24" y="62" width="46" height="6" rx="3" />
    </svg>
  )
}

const SCENES = {
  camera: CameraIllustration,
  stacks: StacksIllustration,
  showcase: ShowcaseIllustration,
  share: ShareIllustration,
  sort: SortIllustration,
} as const

/** Decorative animated art of a feature card; it only moves while the card is the live one. */
export function NewsIllustration({ name, isLive }: NewsIllustrationProps) {
  if (name === 'more') {
    return (
      <div className={`news-illu is-more${isLive ? ' is-live' : ''}`} aria-hidden="true">
        <More />
      </div>
    )
  }
  const Scene = SCENES[name]
  return (
    <div className="news-illu" aria-hidden="true">
      <Scene isLive={isLive} />
    </div>
  )
}
