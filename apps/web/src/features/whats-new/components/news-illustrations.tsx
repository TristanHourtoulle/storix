import type { NewsCard } from '../news-deck'
import { CameraIllustration } from './illustrations/camera-illustration'
import { CelebrationIllustration } from './illustrations/celebration-illustration'
import { EmblemsIllustration } from './illustrations/emblems-illustration'
import { FeedIllustration } from './illustrations/feed-illustration'
import { HistoryIllustration } from './illustrations/history-illustration'
import { JourneyIllustration } from './illustrations/journey-illustration'
import { MembersIllustration } from './illustrations/members-illustration'
import { MythicIllustration } from './illustrations/mythic-illustration'
import { PremiumIllustration } from './illustrations/premium-illustration'
import { ReactionsIllustration } from './illustrations/reactions-illustration'
import { ShareIllustration } from './illustrations/share-illustration'
import { ShowcaseIllustration } from './illustrations/showcase-illustration'
import { SortIllustration } from './illustrations/sort-illustration'
import { StacksIllustration } from './illustrations/stacks-illustration'
import { TaggedIllustration } from './illustrations/tagged-illustration'
import { UpgradeIllustration } from './illustrations/upgrade-illustration'

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
  premium: PremiumIllustration,
  mythic: MythicIllustration,
  upgrade: UpgradeIllustration,
  journey: JourneyIllustration,
  history: HistoryIllustration,
  reactions: ReactionsIllustration,
  members: MembersIllustration,
  tagged: TaggedIllustration,
  emblems: EmblemsIllustration,
  feed: FeedIllustration,
  celebration: CelebrationIllustration,
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
