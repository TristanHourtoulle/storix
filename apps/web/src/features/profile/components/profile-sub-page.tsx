import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useRouter } from '@tanstack/react-router'
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
  const router = useRouter()

  const goBack = useCallback(() => {
    const index: unknown = router.history.location.state.__TSR_index
    if (typeof index === 'number' && index > 0) {
      router.history.back()
      return
    }
    void router.navigate({ to: '/l/$leagueId/profile', params: { leagueId }, replace: true })
  }, [router, leagueId])

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <main className="screen">
      <TopBar
        title={title}
        titleRef={titleRef}
        start={
          <button
            type="button"
            onClick={goBack}
            aria-label="Retour au profil"
            className="icon-btn"
          >
            <Icon name="back" className="size-5" />
          </button>
        }
      />
      {children}
    </main>
  )
}
