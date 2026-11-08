import { useId, useMemo } from 'react'
import type { Portrait } from '@storix/shared'
import { PortraitEditor } from '@/features/portraits/components/portrait-editor'

interface LeaguePhotoSectionProps {
  leagueId: string
  name: string
  photo: Portrait | null
}

/** League photo setting, shown to admins and the owner next to the league rename. */
export function LeaguePhotoSection({ leagueId, name, photo }: LeaguePhotoSectionProps) {
  const headingId = useId()
  const target = useMemo(() => ({ kind: 'league', leagueId }) as const, [leagueId])

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-base">
        Photo de la ligue
      </h2>
      <PortraitEditor
        target={target}
        current={photo}
        fallbackLabel={name}
        shape="rounded"
        cropSubtitle="Photo de la ligue"
        removeTitle="Retirer la photo de la ligue ?"
        removeBody="Les membres verront les initiales de la ligue."
      />
    </section>
  )
}
