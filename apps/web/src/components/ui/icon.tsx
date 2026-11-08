export type IconName =
  | 'home'
  | 'collection'
  | 'plus'
  | 'trade'
  | 'profile'
  | 'close'
  | 'back'
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

const PATHS: Record<IconName, string> = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  collection: 'M3 5h8v14H3zM13 5h8v14h-8z',
  plus: 'M12 5v14M5 12h14',
  trade: 'M4 8h14l-4-4M20 16H6l4 4',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  close: 'M6 6l12 12M18 6L6 18',
  back: 'M15 5l-7 7 7 7',
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
}

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
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
