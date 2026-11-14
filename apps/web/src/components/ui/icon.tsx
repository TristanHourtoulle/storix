export type IconName =
  | 'home'
  | 'collection'
  | 'plus'
  | 'trade'
  | 'shop'
  | 'profile'
  | 'close'
  | 'back'
  | 'forward'
  | 'share'
  | 'dust'
  | 'chevron-down'
  | 'calendar'
  | 'shield'
  | 'check'
  | 'fire'
  | 'heart'
  | 'star'
  | 'lock'
  | 'eye-off'
  | 'rotate'
  | 'chevron-right'
  | 'key'
  | 'exit'
  | 'trash'
  | 'gear'
  | 'photo'
  | 'sound'
  | 'arrow-left'
  | 'arrow-right'
  | 'grid'
  | 'crop'
  | 'retry'
  | 'bell'
  | 'camera'
  | 'flip'
  | 'more'
  | 'stack'
  | 'recycle'
  | 'up'
  | 'crown'
  | 'arrow'
  | 'copy'
  | 'download'
  | 'pack'
  | 'shot'
  | 'gem'
  | 'user'
  | 'pin'
  | 'door'
  | 'search'
  | 'target'
  | 'trophy'
  | 'clap'
  | 'eye'
  | 'leaf'
  | 'sun'
  | 'moon'
  | 'cloud'
  | 'drop'
  | 'flower'
  | 'book'
  | 'music'
  | 'paw'
  | 'shoe'
  | 'window'
  | 'mug'
  | 'cake'
  | 'road'
  | 'ball'
  | 'brush'
  | 'clock'
  | 'hand'
  | 'wind'
  | 'mirror'
  | 'bulb'
  | 'basket'
  | 'monitor'

const PATHS: Record<IconName, string> = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  collection: 'M3 5h8v14H3zM13 5h8v14h-8z',
  plus: 'M12 5v14M5 12h14',
  trade: 'M4 8h14l-4-4M20 16H6l4 4',
  shop: 'M5 8h14l-1.2 11.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9zM9 8V7a3 3 0 0 1 6 0v1',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  close: 'M6 6l12 12M18 6L6 18',
  back: 'M15 5l-7 7 7 7',
  forward: 'M9 5l7 7-7 7',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  download: 'M12 4v11M8 11l4 4 4-4M5 19h14',
  pack: 'M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM6 7h12M6 17h12',
  shot: 'M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM4 16l5-5 4 4 2-2 5 5',
  gem: 'M6 4h12l3 5-9 11L3 9zM3 9h18',
  user: 'M8 8a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6',
  pin: 'M9 3h6l-1 6 4 4H6l4-4zM12 13v8',
  door: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
  search: 'M5 11a6 6 0 1 0 12 0 6 6 0 1 0-12 0M20 20l-4.5-4.5',
  share: 'M12 3v12M8 7l4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-right': 'M9 6l6 6-6 6',
  key: 'M8 11a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM11 12l8-8M16 7l2 2M14 9l2 2',
  exit: 'M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10',
  trash: 'M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2.5v3M12 18.5v3M4.2 6.5l2.6 1.5M17.2 16l2.6 1.5M4.2 17.5l2.6-1.5M17.2 8l2.6-1.5',
  photo:
    'M6 5h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3zM12 8.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM7.5 18a5 5 0 0 1 9 0',
  sound: 'M4 9.5h3.5L12 6v12l-4.5-3.5H4zM15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10',
  'arrow-left': 'M19 12H5M11 6l-6 6 6 6',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  crop: 'M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14',
  retry: 'M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0',
  camera:
    'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  flip: 'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM9 13a3 3 0 0 1 5.2-2M15 13a3 3 0 0 1-5.2 2M14 9.5V11h-1.5M10 16.5V15h1.5',
  dust: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  fire: 'M12 3c.8 3.6 5 5.2 5 10a5 5 0 0 1-10 0c0-2.6 1.4-3.8 2.2-6 1.2.9 2 1.8 2.3 3.2C12.6 8 12.4 5.6 12 3z',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  star: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.6l-5.3 2.8 1.2-6-4.5-4.1 6-.7z',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z',
  rotate:
    'M8 3h6a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM10.5 14h1M19 8a7 7 0 0 1-3 12M16 16v4h4',
  'eye-off':
    'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.2A9.8 9.8 0 0 1 12 5c5 0 8.5 4 9.5 7-.4 1.2-1.2 2.3-2.2 3.3M6.5 6.6C4.5 8 3.2 10 2.5 12c1 3 4.5 7 9.5 7 1.6 0 3-.4 4.2-1',
  more: 'M5.5 12h.01M12 12h.01M18.5 12h.01',
  stack: 'M6 8h12v12H6zM8 5h8M10 2.5h4',
  recycle:
    'M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5',
  up: 'M12 19V6M6 11l6-6 6 6',
  crown: 'M4 8l4 4 4-7 4 7 4-4-2 11H6z',
  arrow: 'M5 12h13M13 6l6 6-6 6',
  target:
    'M12 4a8 8 0 1 0 0 16 8 8 0 1 0 0-16zM12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8zM12 11a1 1 0 1 0 0 2 1 1 0 1 0 0-2z',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8',
  clap: 'M8 13l-2-2a1.5 1.5 0 0 1 2-2l4 4M10 9l3-3a1.5 1.5 0 0 1 2 2l-1 1M14 10l1-1a1.5 1.5 0 0 1 2 2l-5 5a5 5 0 0 1-7-7',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6z',
  leaf: 'M5 19c0-8 5-14 14-14 0 9-6 14-14 14zM5 19l8-8',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  moon: 'M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z',
  cloud: 'M7 18a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 8.5a4.75 4.75 0 0 1 .5 9.5z',
  drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  flower:
    'M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5zM12 9.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM12 14.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM9.5 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM14.5 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0z',
  book: 'M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z',
  music:
    'M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
  paw: 'M12 13c3 0 5 3 5 5a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2c0-2 2-5 5-5zM6 9.5a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5zM18 9.5a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5zM9.5 5a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5zM14.5 5a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5z',
  shoe: 'M3 17V8h5l2 4 6 1.5a4 4 0 0 1 5 3.5v1H3zM3 14h18',
  window: 'M5 4h14v16H5zM12 4v16M5 12h14',
  mug: 'M5 8h11v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v2M12 3v2',
  cake: 'M4 20h16M5 20v-7h14v7M5 16c2 1.5 3.5 1.5 5 0s3.5-1.5 5 0 3.5 1.5 4 0M12 13V9M12 4.5c-.8 1-1 2 0 3 1-1 .8-2 0-3z',
  road: 'M8 3L4 21M16 3l4 18M12 4v3M12 11v3M12 18v2',
  ball: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM12 8l3.5 2.5-1.3 4h-4.4l-1.3-4zM12 3v5M20.5 9.5l-5 1M3.5 9.5l5 1M17 19.5l-2.8-5M7 19.5l2.8-5',
  brush:
    'M18.5 3.5a2.1 2.1 0 0 1 3 3L13 15l-3-3zM10 12c-2.5 0-4 1.5-4 4 0 1.5-1 2.5-3 3 4 1.5 9 1 9-4z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM12 7v5l3 2',
  hand: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11.5V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7c-2.5 0-4-1-5.5-3L3 15a1.5 1.5 0 0 1 2.4-1.8L8 15',
  wind: 'M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8',
  mirror:
    'M12 3c3.9 0 7 3.1 7 7s-3.1 7-7 7-7-3.1-7-7 3.1-7 7-7zM12 17v4M8 21h8M9 8l2-2M9.5 11.5l4.5-4.5',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  basket: 'M3 10h18l-2 10H5zM7 10l4-6M17 10l-4-6M9 14v3M15 14v3M12 14v3',
  monitor: 'M3 4h18v12H3zM8 20h8M12 16v4',
}

const STROKE_WIDTHS: Partial<Record<IconName, number>> = { more: 3 }

interface IconProps {
  name: IconName
  className?: string
}

export function Icon({ name, className = 'size-6' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE_WIDTHS[name] ?? 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
