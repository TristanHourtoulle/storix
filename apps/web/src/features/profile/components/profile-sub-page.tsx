import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Icon } from '@/components/ui/icon'
import { TopBar } from '@/components/ui/top-bar'

interface ProfileSubPageProps {
  leagueId: string
  title: string
  children: ReactNode
}

/** Profile sub-page with a back link to the profile; moves focus to its title on open. */
export function ProfileSubPage({ leagueId, title, children }: ProfileSubPageProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <main className="screen">
      <TopBar
        title={title}
        titleRef={titleRef}
        start={
          <Link
            to="/l/$leagueId/profile"
            params={{ leagueId }}
            aria-label="Retour au profil"
            className="icon-btn"
          >
            <Icon name="back" className="size-5" />
          </Link>
        }
      />
      {children}
    </main>
  )
}
