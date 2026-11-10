import { useMemo, useState } from 'react'
import type { EmblemId, EmblemProgressView } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { orderEmblems } from '../emblem-copy'
import { useFeaturedEmblems } from '../use-featured-emblems'
import { useMemberEmblems } from '../use-member-emblems'
import { EmblemSheet } from './emblem-sheet'
import { EmblemTile } from './emblem-tile'

interface EmblemGridProps {
  leagueId: string
  userId: string
  isSelf: boolean
}

/** Three-column emblem grid of a member, with a detail sheet per emblem. */
export function EmblemGrid({ leagueId, userId, isSelf }: EmblemGridProps) {
  const query = useMemberEmblems(leagueId, userId)
  const featured = useFeaturedEmblems(leagueId, userId)
  const [openId, setOpenId] = useState<EmblemId | null>(null)
  const ordered = useMemo(() => orderEmblems(query.data?.emblems ?? []), [query.data])
  const open = ordered.find((emblem) => emblem.id === openId) ?? null
  const chosen: readonly EmblemId[] = query.data?.featured ?? []

  function toggleFeatured(emblem: EmblemProgressView) {
    const next = chosen.includes(emblem.id)
      ? chosen.filter((id) => id !== emblem.id)
      : [...chosen, emblem.id]
    featured.mutate(next)
  }

  if (query.isError && !query.data) {
    return (
      <section role="alert" className="flex flex-col items-center gap-3 text-center">
        <p className="m-0 text-sm text-muted">Impossible de charger les emblèmes.</p>
        <Button variant="ghost" onClick={() => void query.refetch()}>
          Réessayer
        </Button>
      </section>
    )
  }
  if (!query.data) return <p className="mpage-cnt">Chargement…</p>

  return (
    <>
      <p className="mpage-cnt">
        {query.data.earnedCount} sur {query.data.emblems.length} débloqués
      </p>
      <ul className="egrid">
        {ordered.map((emblem) => (
          <li key={emblem.id}>
            <EmblemTile
              emblem={emblem}
              onOpen={() => {
                featured.reset()
                setOpenId(emblem.id)
              }}
            />
          </li>
        ))}
      </ul>
      <EmblemSheet
        emblem={open}
        canFeature={isSelf}
        featuredIds={chosen}
        isSaving={featured.isPending}
        hasError={featured.isError}
        onToggleFeatured={toggleFeatured}
        onClose={() => setOpenId(null)}
      />
    </>
  )
}
