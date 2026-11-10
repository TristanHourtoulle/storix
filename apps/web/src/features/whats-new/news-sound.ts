import type { SoundSink } from '@/features/boosters/arcade/director'
import { playSound } from '@/features/sound/sound'

/**
 * Sound sink of the what's new stage: the pack burst becomes `newsTear`, every flip
 * becomes `newsFlip`, and every other booster sound (taps, slams, aura, stamp) is dropped.
 */
export const newsSoundSink: SoundSink = (request, delay) => {
  if (request.name === 'burst') playSound({ name: 'newsTear' }, delay)
  else if (request.name === 'flip' || request.name === 'flipLight') {
    playSound({ name: 'newsFlip' }, delay)
  }
}
