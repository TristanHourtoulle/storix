import { useMemo } from 'react'
import type { FeedRow as FeedRowData } from '@storix/shared'
import { useMemberAvatars } from '@/features/portraits/use-member-avatars'
import { feedSections } from '../feed-copy'
import { useBravo } from '../use-bravo'
import { FeedRow } from './feed-row'

interface FeedListProps {
  leagueId: string
  meId: string
  rows: readonly FeedRowData[]
}

/** Feed rows split into "since your last visit" then one block per day. */
export function FeedList({ leagueId, meId, rows }: FeedListProps) {
  const avatars = useMemberAvatars(leagueId)
  const { sendBravo } = useBravo(leagueId)
  const sections = useMemo(() => feedSections(rows), [rows])

  return (
    <div className="feed-sections">
      {sections.map((section) => (
        <section key={section.key} aria-label={section.label} className="feed-section">
          <p className="feed-dayh">{section.label}</p>
          <div className="feed">
            {section.rows.map((row) => (
              <FeedRow
                key={row.id}
                leagueId={leagueId}
                row={row}
                meId={meId}
                avatars={avatars}
                onBravo={sendBravo}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
