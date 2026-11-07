import { Link } from '@tanstack/react-router'
import { Icon } from './icon'

type NavSection = 'home' | 'collection' | 'add' | 'profile'

interface BottomNavProps {
  leagueId: string
  active: NavSection
}

const ITEM =
  'flex min-h-11 w-16 flex-col items-center gap-1 p-0 font-sans text-[11px] font-medium no-underline'

export function BottomNav({ leagueId, active }: BottomNavProps) {
  const current = (section: NavSection) => (active === section ? 'page' : undefined)
  const tone = (section: NavSection): string => (active === section ? 'text-ink' : 'text-faint')

  return (
    <nav
      aria-label="Navigation principale"
      className="sticky bottom-0 mx-auto mt-auto box-border max-w-[480px] flex h-[calc(84px+env(safe-area-inset-bottom))] w-full items-start justify-around bg-nav px-2 pt-2.5 shadow-nav"
    >
      <Link
        to="/l/$leagueId"
        params={{ leagueId }}
        activeOptions={{ exact: true }}
        aria-current={current('home')}
        className={`${ITEM} ${tone('home')}`}
      >
        <Icon name="home" />
        <span>Accueil</span>
      </Link>
      <Link
        to="/l/$leagueId/collection"
        params={{ leagueId }}
        aria-current={current('collection')}
        className={`${ITEM} ${tone('collection')}`}
      >
        <Icon name="collection" />
        <span>Collection</span>
      </Link>
      <Link
        to="/l/$leagueId/add"
        params={{ leagueId }}
        aria-label="Ajouter des photos"
        aria-current={current('add')}
        className={`${ITEM} ${tone('add')}`}
      >
        <span className="-mt-1.5 grid size-12 place-items-center rounded-plus bg-accent text-bg">
          <Icon name="plus" />
        </span>
      </Link>
      <div aria-disabled="true" className={`${ITEM} text-faint opacity-40`}>
        <Icon name="trade" />
        <span>Échanges</span>
        <span className="-mt-1 text-[9px]">bientôt</span>
      </div>
      <Link
        to="/l/$leagueId/profile"
        params={{ leagueId }}
        aria-current={current('profile')}
        className={`${ITEM} ${tone('profile')}`}
      >
        <Icon name="profile" />
        <span>Profil</span>
      </Link>
    </nav>
  )
}
