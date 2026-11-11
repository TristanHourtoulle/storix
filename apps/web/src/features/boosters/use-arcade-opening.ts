import { useCallback, useEffect, useReducer, useRef, useState, type RefObject } from 'react'
import type { BoosterPull } from '@storix/shared'
import { TIER_LABELS } from '@/features/cards/tier-labels'
import { raritySetPalette, revealAuraKind } from '@/features/cosmetics/cosmetic-skins'
import { useEquippedStyle } from '@/features/cosmetics/style-context'
import { playSound, preloadSound, stopSounds } from '@/features/sound/sound'
import { logger } from '@/lib/logger'
import { revealLong, revealQuick, stash } from './arcade/choreography'
import { Director, collectLayers, isStale } from './arcade/director'
import { STAGE_HEIGHT } from './arcade/geometry'
import { PACK_TAPS, burstPack, hitPack } from './arcade/pack-choreography'
import { tierFx } from './arcade/tiers'
import { pullLabel } from './pull-label'

export type ArcadePhase = 'pack' | 'opening' | 'deck' | 'revealing' | 'shown' | 'summary'

interface ArcadeState {
  phase: ArcadePhase
  taps: number
  current: number
  revealed: readonly boolean[]
  stashed: readonly boolean[]
  announcement: string
}

type ArcadeAction =
  | { type: 'tap'; taps: number }
  | { type: 'opening' }
  | { type: 'opened'; announcement: string }
  | { type: 'revealing'; index: number }
  | { type: 'revealed'; index: number; announcement: string }
  | { type: 'stashed'; index: number }
  | { type: 'summary'; announcement: string }

function reducer(state: ArcadeState, action: ArcadeAction): ArcadeState {
  switch (action.type) {
    case 'tap':
      return { ...state, taps: action.taps }
    case 'opening':
      return { ...state, phase: 'opening' }
    case 'opened':
      return { ...state, phase: 'deck', announcement: action.announcement }
    case 'revealing':
      return { ...state, phase: 'revealing', current: action.index }
    case 'revealed':
      return {
        ...state,
        phase: 'shown',
        revealed: state.revealed.map((value, index) => value || index === action.index),
        announcement: action.announcement,
      }
    case 'stashed':
      return {
        ...state,
        phase: 'deck',
        stashed: state.stashed.map((value, index) => value || index === action.index),
      }
    case 'summary':
      return {
        ...state,
        phase: 'summary',
        revealed: state.revealed.map(() => true),
        announcement: action.announcement,
      }
  }
}

function initialState(count: number): ArcadeState {
  return {
    phase: 'pack',
    taps: 0,
    current: -1,
    revealed: Array.from({ length: count }, () => false),
    stashed: Array.from({ length: count }, () => false),
    announcement: '',
  }
}

function describe(pull: BoosterPull, position: number, count: number): string {
  const label = pullLabel(pull)
  const base = `Carte ${position} sur ${count} : ${pull.card.title}, ${TIER_LABELS[pull.card.tier]}.`
  return label ? `${base} ${label}.` : base
}

function summarize(pulls: readonly BoosterPull[]): string {
  const list = pulls.map((pull) => `${pull.card.title} (${TIER_LABELS[pull.card.tier]})`)
  return `Récapitulatif : ${list.join(', ')}.`
}

function hintFor(state: ArcadeState, count: number, isReady: boolean, isReduced: boolean): string {
  switch (state.phase) {
    case 'pack':
      if (isReduced) return 'Touche pour ouvrir le booster'
      if (state.taps === 0) return 'Tape 3 fois sur le booster'
      return state.taps === 1 ? 'Encore 2 tapes' : 'Encore 1 tape !'
    case 'opening':
      return 'Ouverture du booster…'
    case 'revealing':
      return 'Révélation en cours'
    case 'deck':
      if (!isReady) return 'Préparation des cartes…'
      return `Touche pour révéler la carte ${state.current + 2}/${count}`
    case 'shown':
      return state.current >= count - 1
        ? 'Touche pour voir le récapitulatif'
        : `Touche pour la carte ${state.current + 2}/${count}`
    case 'summary':
      return 'Récapitulatif affiché'
  }
}

interface ArcadeOpening {
  state: ArcadeState
  hint: string
  isReduced: boolean
  onTap: () => void
  revealAll: () => void
}

const SUMMARY_PITY_DELAY = 0.95
const REVEAL_ALL_COIN_DELAY = 0.6

function hasPileOrDustGain(pull: BoosterPull): boolean {
  return !pull.isFirstCopy && (pull.dust > 0 || pull.stackCount !== null)
}

function playSummary(withPity: boolean): void {
  playSound({ name: 'summary' })
  if (withPity) playSound({ name: 'pity' }, SUMMARY_PITY_DELAY)
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Drives the arcade opening: pack hits, burst, the first card revealed on its own, then one reveal per tap.
 * Cards new to the collection get the long tier build-up and flip; owned ones get a short flip.
 */
export function useArcadeOpening(
  pulls: readonly BoosterPull[],
  stageRef: RefObject<HTMLDivElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  isReady: boolean,
  isEpicGuaranteedNext = false,
): ArcadeOpening {
  const count = pulls.length
  const [isReduced] = useState(prefersReducedMotion)
  const [state, dispatch] = useReducer(reducer, count, initialState)
  const style = useEquippedStyle()
  const palette = raritySetPalette(style.raritySet)
  const auraKind = revealAuraKind(style.revealAura)
  const directorRef = useRef<Director | null>(null)
  const stateRef = useRef(state)
  const busyRef = useRef(false)
  const tapsRef = useRef(0)
  const isReadyRef = useRef(isReady)

  useEffect(() => {
    stateRef.current = state
    isReadyRef.current = isReady
  })

  useEffect(() => {
    preloadSound()
    return stopSounds
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const director = new Director(collectLayers(stage), isReduced, canvasRef.current)
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
        logger.error('Booster reveal failed', { error })
        director.destroy()
        directorRef.current = null
        dispatch({ type: 'summary', announcement: summarize(pulls) })
      } finally {
        busyRef.current = false
      }
    },
    [pulls],
  )

  const playReveal = useCallback(
    async (director: Director, index: number) => {
      const pull = pulls[index]
      if (!pull) return
      dispatch({ type: 'revealing', index })
      if (pull.isFirstCopy) {
        await revealLong(
          director,
          index,
          tierFx(pull.card.tier, palette, auraKind),
          TIER_LABELS[pull.card.tier],
        )
      } else {
        await revealQuick(director, index)
        if (hasPileOrDustGain(pull)) playSound({ name: 'coin' })
      }
      dispatch({ type: 'revealed', index, announcement: describe(pull, index + 1, count) })
    },
    [pulls, count, palette, auraKind],
  )

  const open = useCallback(
    () =>
      run(async (director) => {
        dispatch({ type: 'opening' })
        await burstPack(director)
        const plural = count > 1 ? 's' : ''
        dispatch({
          type: 'opened',
          announcement: `Booster ouvert. ${count} carte${plural} face cachée.`,
        })
        if (isReadyRef.current) await playReveal(director, 0)
      }),
    [run, count, playReveal],
  )

  const advance = useCallback(
    () =>
      run(async (director) => {
        const { phase, current } = stateRef.current
        if (phase === 'shown') {
          const shown = pulls[current]
          if (shown) await stash(director, current, tierFx(shown.card.tier, palette, auraKind))
          dispatch({ type: 'stashed', index: current })
          if (current >= count - 1) {
            playSummary(isEpicGuaranteedNext)
            dispatch({ type: 'summary', announcement: summarize(pulls) })
            return
          }
        }
        await playReveal(director, current + 1)
      }),
    [run, pulls, count, playReveal, isEpicGuaranteedNext, palette, auraKind],
  )

  const { phase, current } = state
  useEffect(() => {
    if (isReady && phase === 'deck' && current === -1) void advance()
  }, [isReady, phase, current, advance])

  const onTap = useCallback(() => {
    const director = directorRef.current
    const { phase } = stateRef.current
    if (!director || busyRef.current) return
    if (phase === 'pack') {
      if (isReduced) {
        void open()
        return
      }
      tapsRef.current = Math.min(PACK_TAPS, tapsRef.current + 1)
      dispatch({ type: 'tap', taps: tapsRef.current })
      if (hitPack(director, tapsRef.current)) void open()
      return
    }
    if ((phase === 'deck' || phase === 'shown') && isReady) void advance()
  }, [isReduced, isReady, open, advance])

  const revealAll = useCallback(() => {
    const { phase, revealed } = stateRef.current
    if (phase === 'summary') return
    const hasHiddenGain = pulls.some((pull, index) => !revealed[index] && hasPileOrDustGain(pull))
    stopSounds()
    playSound({ name: 'revealAll' })
    if (hasHiddenGain) playSound({ name: 'coin' }, REVEAL_ALL_COIN_DELAY)
    if (isEpicGuaranteedNext) playSound({ name: 'pity' }, REVEAL_ALL_COIN_DELAY + 0.4)
    directorRef.current?.destroy()
    directorRef.current = null
    busyRef.current = true
    dispatch({ type: 'summary', announcement: summarize(pulls) })
  }, [pulls, isEpicGuaranteedNext])

  return { state, hint: hintFor(state, count, isReady, isReduced), isReduced, onTap, revealAll }
}
