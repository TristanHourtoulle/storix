import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from 'react'
import { stash } from '@/features/boosters/arcade/choreography'
import { Director, collectLayers, isStale } from '@/features/boosters/arcade/director'
import { STAGE_HEIGHT } from '@/features/boosters/arcade/geometry'
import { burstPack } from '@/features/boosters/arcade/pack-choreography'
import { tierFx } from '@/features/boosters/arcade/tiers'
import { TIER_LABELS } from '@/features/cards/tier-labels'
import { preloadSound } from '@/features/sound/sound'
import { logger } from '@/lib/logger'
import { revealNewsCard } from './news-choreography'
import type { NewsCard } from './news-deck'
import { newsSoundSink } from './news-sound'

export type NewsPhase = 'pack' | 'opening' | 'revealing' | 'shown' | 'recap'

export interface NewsOpeningState {
  phase: NewsPhase
  current: number
  revealed: readonly boolean[]
  stashed: readonly boolean[]
  announcement: string
}

type NewsAction =
  | { type: 'opening' }
  | { type: 'revealing'; index: number }
  | { type: 'shown'; index: number; announcement: string }
  | { type: 'stashed'; index: number }
  | { type: 'recap'; announcement: string }

function reducer(state: NewsOpeningState, action: NewsAction): NewsOpeningState {
  switch (action.type) {
    case 'opening':
      return { ...state, phase: 'opening' }
    case 'revealing':
      return { ...state, phase: 'revealing', current: action.index }
    case 'shown':
      return {
        ...state,
        phase: 'shown',
        current: action.index,
        revealed: state.revealed.map((value, index) => value || index === action.index),
        announcement: action.announcement,
      }
    case 'stashed':
      return {
        ...state,
        stashed: state.stashed.map((value, index) => value || index === action.index),
      }
    case 'recap':
      return {
        ...state,
        phase: 'recap',
        revealed: state.revealed.map(() => true),
        stashed: state.stashed.map(() => true),
        announcement: action.announcement,
      }
  }
}

function initialState(count: number): NewsOpeningState {
  return {
    phase: 'pack',
    current: -1,
    revealed: Array.from({ length: count }, () => false),
    stashed: Array.from({ length: count }, () => false),
    announcement: '',
  }
}

function describe(card: NewsCard, position: number, count: number): string {
  return `Nouveauté ${position} sur ${count} : ${card.title}, ${TIER_LABELS[card.tier]}.`
}

function summarize(cards: readonly NewsCard[]): string {
  return `Récapitulatif : ${cards.map((card) => card.title).join(', ')}.`
}

function hintFor({ phase, current }: NewsOpeningState, count: number): string {
  switch (phase) {
    case 'pack':
      return 'Touche pour ouvrir'
    case 'opening':
      return 'Ouverture du booster…'
    case 'revealing':
      return 'Révélation en cours'
    case 'shown':
      return current >= count - 1
        ? 'Touche pour voir le récap'
        : `Touche ou glisse pour la suivante · ${current + 1}/${count}`
    case 'recap':
      return ''
  }
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const SWIPE_MIN_PX = 40

interface SwipeStart {
  x: number
  y: number
}

interface NewsOpening {
  state: NewsOpeningState
  hint: string
  isReduced: boolean
  onTap: () => void
  onPointerDown: (event: PointerEvent<HTMLElement>) => void
  onPointerUp: (event: PointerEvent<HTMLElement>) => void
  onPointerCancel: () => void
  next: () => void
  previous: () => void
}

/**
 * Drives the what's new booster: one tap tears the pack, then each feature card flips out
 * with its tier aura. Tap, swipe left or ArrowRight for the next card; swipe right or ArrowLeft
 * for the previous one.
 */
export function useNewsOpening(
  cards: readonly NewsCard[],
  stageRef: RefObject<HTMLDivElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
): NewsOpening {
  const count = cards.length
  const [isReduced] = useState(prefersReducedMotion)
  const [state, dispatch] = useReducer(reducer, count, initialState)
  const directorRef = useRef<Director | null>(null)
  const stateRef = useRef(state)
  const busyRef = useRef(false)
  const swipeRef = useRef<SwipeStart | null>(null)
  const isSwipeClickRef = useRef(false)

  useEffect(() => {
    stateRef.current = state
  })

  useEffect(() => {
    preloadSound()
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const director = new Director(collectLayers(stage), isReduced, canvasRef.current, newsSoundSink)
    directorRef.current = director
    const observer = new ResizeObserver(() => {
      const scale = stage.clientHeight / STAGE_HEIGHT
      stage.style.setProperty('--ar-k', String(scale))
      director.resize(scale)
    })
    observer.observe(stage)
    return () => {
      observer.disconnect()
      director.destroy()
      if (directorRef.current === director) directorRef.current = null
    }
  }, [stageRef, canvasRef, isReduced])

  const run = useCallback(
    async (task: (director: Director) => Promise<void>) => {
      const director = directorRef.current
      if (!director || busyRef.current) return
      busyRef.current = true
      try {
        await task(director)
      } catch (error) {
        if (isStale(error)) return
        logger.error('What is new reveal failed', { error })
        director.destroy()
        directorRef.current = null
        dispatch({ type: 'recap', announcement: summarize(cards) })
      } finally {
        busyRef.current = false
      }
    },
    [cards],
  )

  const show = useCallback(
    async (director: Director, index: number) => {
      const card = cards[index]
      if (!card) return
      const { revealed } = stateRef.current
      const isFirstShow = revealed[index] !== true
      const firstHidden = isFirstShow ? index + 1 : revealed.indexOf(false)
      dispatch({ type: 'revealing', index })
      await revealNewsCard(
        director,
        index,
        tierFx(card.tier),
        firstHidden < 0 ? count : firstHidden,
        isFirstShow,
      )
      dispatch({ type: 'shown', index, announcement: describe(card, index + 1, count) })
    },
    [cards, count],
  )

  const putAway = useCallback(
    async (director: Director, index: number) => {
      const card = cards[index]
      if (!card) return
      await stash(director, index, tierFx(card.tier))
      dispatch({ type: 'stashed', index })
    },
    [cards],
  )

  const open = useCallback(
    () =>
      run(async (director) => {
        dispatch({ type: 'opening' })
        await burstPack(director)
        await show(director, 0)
      }),
    [run, show],
  )

  const next = useCallback(
    () =>
      run(async (director) => {
        const { phase, current } = stateRef.current
        if (phase !== 'shown') return
        await putAway(director, current)
        if (current >= count - 1) {
          dispatch({ type: 'recap', announcement: summarize(cards) })
          return
        }
        await show(director, current + 1)
      }),
    [run, putAway, show, count, cards],
  )

  const previous = useCallback(
    () =>
      run(async (director) => {
        const { phase, current } = stateRef.current
        if (phase !== 'shown' || current <= 0) return
        await putAway(director, current)
        await show(director, current - 1)
      }),
    [run, putAway, show],
  )

  const onTap = useCallback(() => {
    if (isSwipeClickRef.current) {
      isSwipeClickRef.current = false
      return
    }
    const { phase } = stateRef.current
    if (phase === 'pack') void open()
    else if (phase === 'shown') void next()
  }, [open, next])

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    swipeRef.current = { x: event.clientX, y: event.clientY }
    isSwipeClickRef.current = false
  }, [])

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const start = swipeRef.current
      swipeRef.current = null
      if (!start) return
      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) <= Math.abs(dy)) return
      isSwipeClickRef.current = true
      if (dx < 0) void next()
      else void previous()
    },
    [next, previous],
  )

  const onPointerCancel = useCallback(() => {
    swipeRef.current = null
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (stateRef.current.phase !== 'shown') return
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        void next()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        void previous()
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [next, previous])

  return {
    state,
    hint: hintFor(state, count),
    isReduced,
    onTap,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    next,
    previous,
  }
}
