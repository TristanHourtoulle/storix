import { Link } from '@tanstack/react-router'
import { Icon } from './icon'

export type NavSection = 'home' | 'collection' | 'add' | 'shop' | 'profile'

interface BottomNavProps {
  leagueId: string
  active: NavSection
  hasProfileBadge?: boolean
}

const ITEM =
  'flex min-h-11 w-16 flex-col items-center gap-1 p-0 font-sans text-[11px] font-medium no-underline'

export function BottomNav({ leagueId, active, hasProfileBadge = false }: BottomNavProps) {
  const current = (section: NavSection) => (active === section ? 'page' : undefined)
  const tone = (section: NavSection): string => (active === section ? 'text-ink' : 'text-faint')

  return (
    <nav
      aria-label="Navigation principale"
      className="mx-auto box-border flex h-nav w-full max-w-[480px] items-center justify-around bg-nav px-2 pb-[env(safe-area-inset-bottom)] shadow-nav"
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
      <Link
        to="/l/$leagueId/shop"
        params={{ leagueId }}
        aria-current={current('shop')}
        className={`${ITEM} ${tone('shop')}`}
      >
        <Icon name="shop" />
        <span>Boutique</span>
      </Link>
      <Link
        to="/l/$leagueId/profile"
        params={{ leagueId }}
        aria-current={current('profile')}
        aria-label={hasProfileBadge ? 'Profil, nouveautés à voir' : undefined}
        className={`${ITEM} ${tone('profile')}`}
      >
        <span className="relative grid place-items-center">
          <Icon name="profile" />
          {hasProfileBadge ? (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-1 size-2 rounded-full bg-tier-uncommon ring-2 ring-nav"
            />
          ) : null}
        </span>
        <span>Profil</span>
      </Link>
    </nav>
  )
}
