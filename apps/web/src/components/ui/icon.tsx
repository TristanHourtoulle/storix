export type IconName =
  'home' | 'collection' | 'plus' | 'trade' | 'profile' | 'close' | 'back' | 'share' | 'dust' | 'chevron-down'

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
