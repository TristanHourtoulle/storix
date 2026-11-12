import { useState } from 'react'

export type TravelDirection = 'from-left' | 'from-right' | 'from-none'

/** Which side new content should slide in from, given its position compared with the previous one. */
export function useTravelDirection(position: number): TravelDirection {
  const [previous, setPrevious] = useState(position)
  const [direction, setDirection] = useState<TravelDirection>('from-none')
  if (previous !== position) {
    setPrevious(position)
    setDirection(position > previous ? 'from-right' : 'from-left')
  }
  return direction
}
