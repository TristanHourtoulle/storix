import { useCallback, useEffect, useReducer, useRef } from 'react'

const REVEAL_STAGGER_MS = 120

interface RevealState {
  revealed: readonly boolean[]
  featured: number | null
}

type RevealAction = { type: 'reveal'; index: number }

interface RevealControls extends RevealState {
  reveal: (index: number) => void
  revealAll: () => void
  isComplete: boolean
}

function reducer(state: RevealState, action: RevealAction): RevealState {
  if (action.index < 0 || action.index >= state.revealed.length) return state
  if (state.revealed[action.index] && state.featured === action.index) return state
  return {
    revealed: state.revealed.map((value, index) => value || index === action.index),
    featured: action.index,
  }
}

/** Tracks which of `count` cards are flipped, the featured one, and the staggered reveal-all. */
export function useRevealState(count: number): RevealControls {
  const [state, dispatch] = useReducer(reducer, {
    revealed: Array.from({ length: count }, () => false),
    featured: null,
  })
  const stateRef = useRef(state)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    stateRef.current = state
  })

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    },
    [],
  )

  const reveal = useCallback((index: number) => dispatch({ type: 'reveal', index }), [])

  const revealAll = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    const pending = stateRef.current.revealed.flatMap((isRevealed, index) =>
      isRevealed ? [] : [index],
    )
    timersRef.current = pending.map((index, order) =>
      setTimeout(() => dispatch({ type: 'reveal', index }), order * REVEAL_STAGGER_MS),
    )
  }, [])

  return { ...state, reveal, revealAll, isComplete: state.revealed.every(Boolean) }
}
