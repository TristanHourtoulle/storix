import type { ReactNode } from 'react'
import '@/styles/news-ill-kit.css'

export type MiniTier = 'C' | 'U' | 'R' | 'E' | 'L' | 'M'

const ICON_PATHS = {
  flip: 'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM9 13a3 3 0 0 1 5.2-2M15 13a3 3 0 0 1-5.2 2M14 9.5V11h-1.5M10 16.5V15h1.5',
  recycle:
    'M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5',
  up: 'M12 19V6M6 11l6-6 6 6',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  sort: 'M4 7h16M7 12h10M10 17h4',
  chat: 'M5 5h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-5 4v-4H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  download: 'M12 4v11M8 11l4 4 4-4M5 19h14',
  more: 'M5.5 12h.01M12 12h.01M18.5 12h.01',
  check: 'M5 12.5l4.5 4.5L19 7.5',
} as const

interface IllIconProps {
  name: keyof typeof ICON_PATHS
  strokeWidth?: number
}

/** Line icon drawn with the app's icon geometry (24 grid, round caps). */
export function IllIcon({ name, strokeWidth }: IllIconProps) {
  return (
    <svg className="ni-i" viewBox="0 0 24 24" style={strokeWidth ? { strokeWidth } : undefined}>
      <path d={ICON_PATHS[name]} />
    </svg>
  )
}

interface MiniCardProps {
  tier: MiniTier
  art: 0 | 1 | 2 | 3 | 4
  name?: string
  label?: ReactNode
  className?: string
  isBig?: boolean
  children?: ReactNode
}

/** Miniature collectible card used inside the feature illustrations. */
export function MiniCard({
  tier,
  art,
  name,
  label,
  className = '',
  isBig = false,
  children,
}: MiniCardProps) {
  return (
    <div className={`ni-mc t-${tier}${isBig ? ' is-big' : ''} ${className}`}>
      {children}
      <div className={`ni-art h${art}`} />
      <div className="ni-holo" />
      <i className="ni-gem" />
      {name ? (
        <div className="ni-band">
          <b>{name}</b>
          <span>{label}</span>
        </div>
      ) : null}
    </div>
  )
}

interface IllFrameProps {
  scene: string
  isLive: boolean
  children: ReactNode
}

/** 260 px illustration box scaled to the card, animated only while `isLive`. */
export function IllFrame({ scene, isLive, children }: IllFrameProps) {
  return (
    <div className="ni-fit">
      <div className={`ni-ill ni-${scene}${isLive ? ' is-live' : ''}`}>{children}</div>
    </div>
  )
}
