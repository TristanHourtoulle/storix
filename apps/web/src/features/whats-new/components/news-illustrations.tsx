import { useId } from 'react'
import type { NewsCard } from '../news-deck'

interface NewsIllustrationProps {
  name: NewsCard['illustration']
}

function Camera() {
  return (
    <svg viewBox="0 0 100 100">
      <rect className="ni-card" x="36" y="30" width="28" height="40" rx="4" />
      <rect className="ni-sun" x="42" y="38" width="16" height="16" rx="8" />
      <g className="ni-brackets">
        <path d="M24 32V22H34" />
        <path d="M66 22H76V32" />
        <path d="M76 68V78H66" />
        <path d="M34 78H24V68" />
      </g>
      <rect className="ni-flash" x="0" y="0" width="100" height="100" />
    </svg>
  )
}

function Stacks() {
  return (
    <svg viewBox="0 0 100 100">
      <rect className="ni-card ni-drop" x="34" y="42" width="32" height="42" rx="4" />
      <rect className="ni-card ni-drop is-2" x="34" y="36" width="32" height="42" rx="4" />
      <rect className="ni-card ni-drop is-3" x="34" y="30" width="32" height="42" rx="4" />
      <g className="ni-badge">
        <rect x="56" y="18" width="26" height="16" rx="8" />
        <text x="69" y="29.5">
          ×3
        </text>
      </g>
    </svg>
  )
}

function Showcase() {
  const clipId = `ni-clip-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <clipPath id={clipId}>
          <rect x="28" y="18" width="44" height="64" rx="6" />
        </clipPath>
      </defs>
      <g className="ni-grow">
        <rect className="ni-card" x="28" y="18" width="44" height="64" rx="6" />
        <rect className="ni-sun" x="38" y="30" width="24" height="24" rx="12" />
        <g clipPath={`url(#${clipId})`}>
          <rect className="ni-glare" x="10" y="0" width="14" height="100" />
        </g>
      </g>
    </svg>
  )
}

function Share() {
  return (
    <svg viewBox="0 0 100 100">
      <rect className="ni-card ni-tile is-left" x="38" y="30" width="24" height="34" rx="4" />
      <rect className="ni-card ni-tile is-right" x="38" y="30" width="24" height="34" rx="4" />
      <rect className="ni-card ni-tile" x="38" y="30" width="24" height="34" rx="4" />
      <path className="ni-arrow" d="M50 82V72M45 76L50 71L55 76" />
    </svg>
  )
}

function Sort() {
  const cells = [
    [22, 26],
    [42, 26],
    [62, 26],
    [22, 54],
    [42, 54],
    [62, 54],
  ] as const
  return (
    <svg viewBox="0 0 100 100">
      {cells.map(([x, y], index) => (
        <rect
          key={`${x}-${y}`}
          className={`ni-card ni-cell is-${index}`}
          x={x}
          y={y}
          width="16"
          height="22"
          rx="3"
        />
      ))}
      <g className="ni-new">
        <rect x="52" y="16" width="30" height="13" rx="6.5" />
        <text x="67" y="25.5">
          ✦ NEW
        </text>
      </g>
    </svg>
  )
}

function More() {
  return (
    <svg viewBox="0 0 100 100">
      <rect className="ni-line is-0" x="24" y="32" width="52" height="6" rx="3" />
      <rect className="ni-line is-1" x="24" y="47" width="40" height="6" rx="3" />
      <rect className="ni-line is-2" x="24" y="62" width="46" height="6" rx="3" />
    </svg>
  )
}

const ILLUSTRATIONS = {
  camera: Camera,
  stacks: Stacks,
  showcase: Showcase,
  share: Share,
  sort: Sort,
  more: More,
} as const

/** Decorative animated art of a feature card, drawn in its tier colour. */
export function NewsIllustration({ name }: NewsIllustrationProps) {
  const Art = ILLUSTRATIONS[name]
  return (
    <div className={`news-illu is-${name}`} aria-hidden="true">
      <Art />
    </div>
  )
}
