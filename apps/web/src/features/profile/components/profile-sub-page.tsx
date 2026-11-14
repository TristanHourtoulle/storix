import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Icon } from '@/components/ui/icon'
import { TopBar } from '@/components/ui/top-bar'

interface ProfileSubPageProps {
  leagueId: string
  title: string
  subtitle?: string | undefined
  backLabel?: string
  fallback?: 'profile' | 'home'
  layout?: 'centered' | 'leading'
  children: ReactNode
}

/**
 * Sub-page whose back button returns to the previous screen, or the fallback screen; moves focus to
 * its title on open. `leading` stacks the title and subtitle left-aligned right after the back button.
 */
export function ProfileSubPage({
  leagueId,
  title,
  subtitle,
  backLabel = 'Retour au profil',
  fallback = 'profile',
  layout = 'centered',
  children,
}: ProfileSubPageProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const router = useRouter()

  const goBack = useCallback(() => {
    const index: unknown = router.history.location.state.__TSR_index
    if (typeof index === 'number' && index > 0) {
      router.history.back()
      return
    }
    void router.navigate({
      to: fallback === 'home' ? '/l/$leagueId' : '/l/$leagueId/profile',
      params: { leagueId },
      replace: true,
    })
  }, [router, leagueId, fallback])

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true })
  }, [])

  const backButton = (
    <button type="button" onClick={goBack} aria-label={backLabel} className="icon-btn">
      <Icon name="back" className="size-5" />
    </button>
  )

  if (layout === 'leading') {
    return (
      <main className="screen">
        <header className="flex min-h-11 items-center gap-3">
          <div className="flex-none">{backButton}</div>
          <div className="flex min-w-0 flex-1 flex-col items-start">
            <h1
              ref={titleRef}
              tabIndex={-1}
              className="m-0 w-full truncate font-display text-[17px] font-bold text-ink outline-none"
            >
              {title}
            </h1>
            {subtitle ? (
              <p className="m-0 mt-0.5 w-full truncate text-xs text-faint">{subtitle}</p>
            ) : null}
          </div>
        </header>
        {children}
      </main>
    )
  }

  return (
    <main className="screen">
      <TopBar title={title} titleRef={titleRef} start={backButton} />
      {subtitle ? <p className="-mt-3 mb-0 text-center text-xs text-faint">{subtitle}</p> : null}
      {children}
    </main>
  )
}
