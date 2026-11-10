import { FEED_FILTER_IDS, type FeedFilter } from '@storix/shared'

const FILTER_LABELS: Record<FeedFilter, string> = {
  all: 'Tout',
  pulls: 'Tirages',
  photos: 'Photos',
  feats: 'Exploits',
}

interface FeedFiltersProps {
  value: FeedFilter
  onChange: (filter: FeedFilter) => void
}

/** The Tout / Tirages / Photos / Exploits chips above the feed. */
export function FeedFilters({ value, onChange }: FeedFiltersProps) {
  return (
    <div className="filterrow" role="group" aria-label="Filtrer le fil">
      {FEED_FILTER_IDS.map((filter) => (
        <button
          key={filter}
          type="button"
          aria-pressed={value === filter}
          onClick={() => onChange(filter)}
        >
          {FILTER_LABELS[filter]}
        </button>
      ))}
    </div>
  )
}
