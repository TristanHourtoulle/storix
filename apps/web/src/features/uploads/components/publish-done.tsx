import { Link } from '@tanstack/react-router'
import { buttonClassName } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Notice } from '@/components/ui/notice'
import { plural } from '../upload-copy'

interface PublishDoneProps {
  leagueId: string
  count: number
  duplicates: number
  notice: string | null
}

/** The end of a publish (R20). */
export function PublishDone({ leagueId, count, duplicates, notice }: PublishDoneProps) {
  const ignored =
    duplicates > 0 ? `${plural(duplicates, 'doublon ignoré', 'doublons ignorés')}. ` : ''
  const isPending = count === 0
  return (
    <main className="screen flex-1 justify-center text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-surface text-tier-uncommon shadow-hairline">
        <Icon name="check" className="size-8" />
      </span>
      <h1 role="status">
        {isPending ? 'Publication en cours' : plural(count, 'carte publiée', 'cartes publiées')}
      </h1>
      <p className="m-0 text-sm leading-snug text-muted">
        {isPending
          ? 'Tes cartes apparaîtront dans la collection dès qu’elles seront prêtes.'
          : `${ignored}Elles entreront dans les boosters de la ligue. La rareté se calcule dans la minute.`}
      </p>
      {notice ? <Notice tone="info">{notice}</Notice> : null}
      <Link
        to="/l/$leagueId/collection"
        params={{ leagueId }}
        className={buttonClassName({ variant: 'primary', block: true })}
      >
        Voir la collection
      </Link>
    </main>
  )
}
