import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { membersQueryOptions } from '@/features/members/members.queries'
import { groupByParisDay } from '@/lib/paris-dates'
import {
  DEFAULT_JOURNAL_FILTERS,
  JOURNAL_CHIPS,
  JOURNAL_CHIP_LABELS,
  sheetFilterCount,
  type JournalFilters,
} from '../journal-filters'
import { useJournal, useMarkJournalSeen } from '../use-journal'
import { JournalFilterSheet } from './journal-filter-sheet'
import { JournalRow } from './journal-row'

interface JournalPanelProps {
  leagueId: string
}

/** The admin Journal: category chips, a filter sheet, then audit sentences grouped by day. */
export function JournalPanel({ leagueId }: JournalPanelProps) {
  const [filters, setFilters] = useState<JournalFilters>(DEFAULT_JOURNAL_FILTERS)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const members = useQuery(membersQueryOptions(leagueId)).data ?? []
  const query = useJournal(leagueId, filters)
  const { data, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = query
  const markSeen = useMarkJournalSeen(leagueId)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const days = useMemo(
    () =>
      groupByParisDay(
        data?.pages.flatMap((page) => page.entries) ?? [],
        (entry) => entry.createdAt,
      ),
    [data],
  )
  const sheetCount = sheetFilterCount(filters)

  useEffect(() => {
    markSeen()
  }, [markSeen])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasNextPage || isFetchingNextPage || isFetchNextPageError) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void fetchNextPage()
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage])

  return (
    <div className="journal">
      <div className="filterrow" role="group" aria-label="Filtrer le journal">
        {JOURNAL_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            aria-pressed={filters.chip === chip}
            onClick={() => setFilters((prev) => ({ ...prev, chip }))}
          >
            {JOURNAL_CHIP_LABELS[chip]}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={sheetCount > 0}
          aria-haspopup="dialog"
          onClick={() => setIsSheetOpen(true)}
        >
          ⋯ Membre, dates{sheetCount > 0 ? ` · ${sheetCount}` : ''}
        </button>
      </div>
      {query.isPending ? (
        <div className="feed-skeleton" aria-hidden="true" />
      ) : !data ? (
        <div role="alert" className="grid justify-items-center gap-3 text-center">
          <p className="m-0 text-sm text-muted">Impossible de charger le journal.</p>
          <Button variant="ghost" onClick={() => void query.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : days.length === 0 ? (
        <p className="m-0 text-center text-sm text-faint">Rien dans le journal pour ces filtres</p>
      ) : (
        days.map((day) => (
          <section key={day.key} aria-label={day.label} className="jday-block">
            <p className="jday">{day.label}</p>
            {day.items.map((entry) => (
              <JournalRow key={entry.id} entry={entry} />
            ))}
          </section>
        ))
      )}
      <div ref={sentinelRef} aria-hidden="true" />
      {isFetchNextPageError ? (
        <Button variant="ghost" onClick={() => void fetchNextPage()} isLoading={isFetchingNextPage}>
          Charger la suite
        </Button>
      ) : null}
      <JournalFilterSheet
        leagueId={leagueId}
        open={isSheetOpen}
        value={filters}
        members={members}
        onApply={setFilters}
        onClose={() => setIsSheetOpen(false)}
      />
    </div>
  )
}
