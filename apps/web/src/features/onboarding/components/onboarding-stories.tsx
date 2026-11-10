import { inAppBrowserOf, installContextOf } from '@storix/shared'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { buttonClassName } from '@/components/ui/button'
import { useModalLayer } from '@/components/crop/use-modal-layer'
import { walletQueryOptions } from '@/features/game/game.queries'
import { useInstallPrompt } from '@/features/pwa/install-prompt'
import { playSound } from '@/features/sound/sound'
import { platformFamily, readInstallEnv } from '@/lib/platform'
import '@/styles/onboarding.css'
import { buildGameStories, installStoryCopy, type Story } from '../onboarding-stories'
import { InstallStory } from './install-story'
import { StoryVisual } from './story-visuals'

export type OnboardingCloseReason = 'skip' | 'later' | 'photo' | 'done'

interface OnboardingStoriesProps {
  leagueId: string
  mode: 'auto' | 'replay'
  onClose: (reason: OnboardingCloseReason) => void
}

function useInstallContext() {
  const { canPrompt } = useInstallPrompt()
  const [isJustInstalled, setIsJustInstalled] = useState(false)
  const env = useMemo(() => readInstallEnv(canPrompt), [canPrompt])
  const markInstalled = useCallback(() => setIsJustInstalled(true), [])
  return {
    context: isJustInstalled ? ('installed' as const) : installContextOf(env),
    inAppBrowser: inAppBrowserOf(env.userAgent),
    family: platformFamily(),
    markInstalled,
  }
}

/** Full-screen "Premiers pas" stories for new accounts; moves only on a tap or an arrow key. */
export function OnboardingStories({ leagueId, mode, onClose }: OnboardingStoriesProps) {
  const { data: wallet } = useQuery(walletQueryOptions(leagueId))
  const install = useInstallContext()
  const installTitle = installStoryCopy({ ...install, canEnablePush: false }).title
  const installStory = useMemo<Story>(
    () => ({ key: 'install', tint: 'accent', title: installTitle, text: '' }),
    [installTitle],
  )
  const stories = useMemo(() => [...buildGameStories(wallet), installStory], [installStory, wallet])
  const skip = useCallback(() => onClose('skip'), [onClose])
  const { container, layerRef } = useModalLayer(skip)
  const nextRef = useRef<HTMLButtonElement>(null)
  const [index, setIndex] = useState(0)
  const [hasMoved, setHasMoved] = useState(false)
  const lastIndex = stories.length - 1
  const story = stories[index] ?? installStory

  useEffect(() => {
    nextRef.current?.focus()
  }, [])

  const goTo = useCallback(
    (target: number) => {
      const clamped = Math.max(0, Math.min(lastIndex, target))
      if (clamped === index) return
      playSound({ name: 'newsFlip' })
      setIndex(clamped)
      setHasMoved(true)
    },
    [index, lastIndex],
  )

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight') goTo(index + 1)
    else if (event.key === 'ArrowLeft') goTo(index - 1)
    else if (event.key === ' ' && event.target === event.currentTarget) goTo(index + 1)
    else return
    event.preventDefault()
  }

  function addPhoto() {
    playSound({ name: 'confirm' })
    onClose('photo')
  }

  return createPortal(
    <div
      ref={layerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Premiers pas"
      className="ob-layer"
      data-mode={mode}
      onKeyDown={handleKeyDown}
    >
      <div className="ob-story">
        <div className="ob-bg" data-tint={story.tint} />
        <div className="ob-bars" aria-hidden="true">
          {stories.map((entry, position) => (
            <i
              key={entry.key}
              className={position < index ? 'done' : position === index ? 'cur' : undefined}
            >
              <b />
            </i>
          ))}
        </div>
        <div className="ob-top">
          <span className="ob-brand">Storix · Premiers pas</span>
          <button
            type="button"
            className="ob-text-button ob-hit"
            aria-label="Passer"
            onClick={skip}
          >
            ✕
          </button>
        </div>
        {story.key === 'install' ? (
          <InstallStory
            context={install.context}
            inAppBrowser={install.inAppBrowser}
            family={install.family}
            onInstalled={install.markInstalled}
            footer={
              mode === 'replay' ? (
                <div className="ob-hit mt-2 grid gap-1">
                  <button
                    type="button"
                    className={buttonClassName({ variant: 'primary', block: true })}
                    onClick={() => onClose('done')}
                  >
                    Terminer
                  </button>
                </div>
              ) : (
                <div className="ob-hit mt-2 grid gap-1">
                  <button
                    type="button"
                    className={buttonClassName({ variant: 'primary', block: true })}
                    onClick={addPhoto}
                  >
                    Ajouter ma première photo
                  </button>
                  <button type="button" className="ob-text-button" onClick={() => onClose('later')}>
                    Plus tard
                  </button>
                </div>
              )
            }
          />
        ) : (
          <>
            <div className="ob-visual" aria-hidden="true">
              <StoryVisual storyKey={story.key} />
            </div>
            <div className="ob-txt">
              <h2>{story.title}</h2>
              <p>{story.text}</p>
              {index === 0 && !hasMoved ? (
                <p className="ob-hint">Touche à droite pour continuer</p>
              ) : null}
            </div>
          </>
        )}
        <div className="ob-tapzones">
          <button type="button" aria-label="Story précédente" onClick={() => goTo(index - 1)} />
          <button
            ref={nextRef}
            type="button"
            aria-label="Story suivante"
            onClick={() => goTo(index + 1)}
          />
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {`Story ${index + 1} sur ${stories.length} : ${story.title}`}
      </p>
    </div>,
    container,
  )
}
