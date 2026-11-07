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
