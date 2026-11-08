export type SoundCategory = 'booster' | 'interface'

export type ReactionSound = 'reactFire' | 'reactHeart' | 'reactStar'

export type SoundRequest =
  | { name: 'packTap'; step: number }
  | { name: 'burst' }
  | { name: 'slam'; index: number }
  | { name: 'aura'; level: number; duration: number }
  | { name: 'flip' }
  | { name: 'stamp'; level: number }
  | { name: 'coin' }
  | { name: 'revealAll' }
  | { name: 'summary' }
  | { name: 'pity' }
  | { name: 'boosterReady' }
  | { name: 'countdownEnd' }
  | { name: 'locked' }
  | { name: ReactionSound }
  | { name: 'photoAdded' }
  | { name: 'cardCreated' }
  | { name: 'quota' }
  | { name: 'cardRemoved' }
  | { name: 'pinMythic' }
  | { name: 'tap' }
  | { name: 'confirm' }
  | { name: 'error' }
  | { name: 'destructive' }

export type SoundName = SoundRequest['name']

export const SOUND_CATEGORY: Readonly<Record<SoundName, SoundCategory>> = {
  packTap: 'booster',
  burst: 'booster',
  slam: 'booster',
  aura: 'booster',
  flip: 'booster',
  stamp: 'booster',
  coin: 'booster',
  revealAll: 'booster',
  summary: 'booster',
  pity: 'booster',
  boosterReady: 'interface',
  countdownEnd: 'interface',
  locked: 'interface',
  reactFire: 'interface',
  reactHeart: 'interface',
  reactStar: 'interface',
  photoAdded: 'interface',
  cardCreated: 'interface',
  quota: 'interface',
  cardRemoved: 'interface',
  pinMythic: 'interface',
  tap: 'interface',
  confirm: 'interface',
  error: 'interface',
  destructive: 'interface',
}

/** Key used to debounce repeats: the sound name plus its step, index or tier level. */
export function debounceKey(request: SoundRequest): string {
  switch (request.name) {
    case 'packTap':
      return `${request.name}:${request.step}`
    case 'slam':
      return `${request.name}:${request.index}`
    case 'aura':
    case 'stamp':
      return `${request.name}:${request.level}`
    default:
      return request.name
  }
}
