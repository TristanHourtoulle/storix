import { Link } from '@tanstack/react-router'
import { buttonClassName } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { plural } from '../upload-copy'
import { useDrafts } from '../use-drafts'

interface DraftBannerProps {
  leagueId: string
}

/** "Brouillon · {n} photos" with "Reprendre" (R22); nothing while loading or without drafts. */
export function DraftBanner({ leagueId }: DraftBannerProps) {
  const { data: drafts } = useDrafts(leagueId)
  if (!drafts || drafts.length === 0) return null
  const untitled = drafts.filter((draft) => (draft.title ?? '').trim() === '').length
  const status =
    untitled > 0 ? `${plural(untitled, 'titre', 'titres')} à remplir` : 'Prêt à publier'

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-3 rounded-panel bg-surface p-3.5 shadow-hairline">
        <span className="grid size-11 flex-none place-items-center rounded-control bg-surface-2 text-accent-hover">
          <Icon name="photo" className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <b className="font-display text-[15px] font-semibold">
            Brouillon · {plural(drafts.length, 'photo', 'photos')}
          </b>
          <span className="text-xs text-muted">{status} · gardé 48 h</span>
        </div>
        <Link
          to="/l/$leagueId/add"
          params={{ leagueId }}
          search={{ resume: true }}
          className={`${buttonClassName({ variant: 'primary' })} !h-10 !px-4 !text-sm`}
        >
          Reprendre
        </Link>
      </div>
      <p className="m-0 text-xs text-faint">
        Le brouillon n&apos;est visible que par toi. Il n&apos;entre pas dans les boosters.
      </p>
    </section>
  )
}
