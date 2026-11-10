import type { ReleaseNote } from '@storix/shared'
import { featureCountLabel } from '../news-deck'
import { formatReleaseDay } from '../release-dates'

interface NewsPackListProps {
  releases: readonly ReleaseNote[]
  isUnseen: (releaseId: string) => boolean
  onOpen: (release: ReleaseNote) => void
}

interface MiniPackProps {
  day: string
  isSealed: boolean
}

function MiniPack({ day, isSealed }: MiniPackProps) {
  return (
    <span
      aria-hidden="true"
      className={`relative flex h-[62px] w-[44px] flex-none flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg bg-[linear-gradient(150deg,#3d2585_0%,#2b1b5a_38%,#123e52_78%,#0e3b4a_100%)] shadow-hairline-strong ${isSealed ? '' : 'opacity-60'}`}
    >
      <span
        className={`absolute inset-x-0 top-0 h-1.5 ${isSealed ? 'bg-white/15' : 'border-b border-dashed border-white/40'}`}
      />
      <span className="absolute inset-x-0 bottom-0 h-1.5 bg-white/15" />
      <span className="font-display text-[8px] font-bold tracking-[0.12em] text-ink">STORIX</span>
      <span className="text-[8px] text-ink-2">{day}</span>
    </span>
  )
}

/** One sealed or opened mini pack per release, newest first; tapping one replays it. */
export function NewsPackList({ releases, isUnseen, onOpen }: NewsPackListProps) {
  return (
    <ul className="m-0 flex list-none flex-col divide-y divide-line overflow-hidden rounded-control bg-surface p-0 shadow-hairline">
      {releases.map((release) => {
        const day = formatReleaseDay(release.publishedAt)
        const isNew = isUnseen(release.id)
        return (
          <li key={release.id}>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => onOpen(release)}
              className="flex w-full cursor-pointer items-center gap-3.5 border-0 bg-transparent px-3.5 py-3 text-left font-[inherit] text-ink hover:bg-surface-2 focus-visible:bg-surface-2"
            >
              <MiniPack day={day} isSealed={isNew} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-medium">Mise à jour · {day}</span>
                  {isNew ? (
                    <span className="flex-none rounded-full bg-tier-uncommon/15 px-2 py-0.5 text-[11px] font-semibold text-tier-uncommon">
                      Nouveau
                    </span>
                  ) : null}
                </span>
                <span className="text-[13px] text-muted">
                  {featureCountLabel(release.cards.length)}
                </span>
                <span className="truncate text-[13px] text-faint">
                  {release.cards.map((card) => card.title).join(' · ')}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
