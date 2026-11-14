import type { TrophyId } from '@storix/shared'

type GlyphName =
  | 'star'
  | 'crown'
  | 'box'
  | 'flask'
  | 'recycle'
  | 'coin'
  | 'sparkle'
  | 'compass'
  | 'camera'
  | 'heart'
  | 'clover'
  | 'clock'
  | 'flame'

interface TrophyLook {
  glyph: GlyphName
  color: string
}

/** Icon and colour of each trophy, as in the design artifact. */
export const TROPHY_LOOKS: Readonly<Record<TrophyId, TrophyLook>> = {
  myth: { glyph: 'star', color: '#f472b6' },
  leg: { glyph: 'crown', color: '#fbbf24' },
  open: { glyph: 'box', color: '#22d3ee' },
  alch: { glyph: 'flask', color: '#c084fc' },
  recy: { glyph: 'recycle', color: '#4ade80' },
  rich: { glyph: 'coin', color: '#fbbf24' },
  foil: { glyph: 'sparkle', color: '#67e8f9' },
  disc: { glyph: 'compass', color: '#60a5fa' },
  photo: { glyph: 'camera', color: '#d4d4e0' },
  muse: { glyph: 'heart', color: '#f472b6' },
  luck: { glyph: 'clover', color: '#4ade80' },
  moment: { glyph: 'clock', color: '#60a5fa' },
  miss: { glyph: 'flame', color: '#f87171' },
  shop: { glyph: 'coin', color: '#a78bfa' },
}

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
} as const

function GlyphPaths({ name }: { name: GlyphName }) {
  switch (name) {
    case 'star':
      return (
        <path
          d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
          fill="currentColor"
        />
      )
    case 'crown':
      return <path d="M3 7.5l4.5 4 4.5-7 4.5 7 4.5-4-2 11H5z" fill="currentColor" />
    case 'box':
      return (
        <>
          <path d="M3 8l9-4.5L21 8v8.5L12 21l-9-4.5z" {...STROKE} strokeLinejoin="round" />
          <path d="M3 8l9 4.5L21 8M12 12.5V21" {...STROKE} />
        </>
      )
    case 'flask':
      return (
        <>
          <path
            d="M9 2.5h6M10 2.5v6L4.5 19a1.6 1.6 0 0 0 1.4 2.4h12.2a1.6 1.6 0 0 0 1.4-2.4L14 8.5v-6"
            {...STROKE}
            strokeLinejoin="round"
          />
          <path d="M7 15h10" {...STROKE} />
        </>
      )
    case 'recycle':
      return (
        <>
          <path
            d="M7 7.5A7 7 0 0 1 19 10M17 16.5A7 7 0 0 1 5 14"
            {...STROKE}
            strokeLinecap="round"
          />
          <path d="M19 4.5V10h-5.5M5 19.5V14h5.5" {...STROKE} strokeLinejoin="round" />
        </>
      )
    case 'coin':
      return (
        <>
          <circle cx="12" cy="12" r="8.5" {...STROKE} />
          <path
            d="M12 6.5l1.6 3.9 4 .4-3 2.7.9 4-3.5-2.1-3.5 2.1.9-4-3-2.7 4-.4z"
            fill="currentColor"
          />
        </>
      )
    case 'sparkle':
      return (
        <path d="M12 2l2 7.5L21.5 12 14 14.5 12 22l-2-7.5L2.5 12 10 9.5z" fill="currentColor" />
      )
    case 'compass':
      return (
        <>
          <circle cx="12" cy="12" r="9" {...STROKE} />
          <path d="M15.5 8.5l-2 5-5 2 2-5z" fill="currentColor" />
        </>
      )
    case 'camera':
      return (
        <>
          <path
            d="M3.5 8a2 2 0 0 1 2-2h2l1.5-2h6L16.5 6h2a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"
            {...STROKE}
          />
          <circle cx="12" cy="12.5" r="3.5" {...STROKE} />
        </>
      )
    case 'heart':
      return (
        <path
          d="M12 20.5S3.5 15.5 3.5 9.2A4.7 4.7 0 0 1 12 6.6a4.7 4.7 0 0 1 8.5 2.6c0 6.3-8.5 11.3-8.5 11.3z"
          fill="currentColor"
        />
      )
    case 'clover':
      return (
        <>
          <circle cx="8.5" cy="8.5" r="4" fill="currentColor" />
          <circle cx="15.5" cy="8.5" r="4" fill="currentColor" />
          <circle cx="8.5" cy="15.5" r="4" fill="currentColor" />
          <circle cx="15.5" cy="15.5" r="4" fill="currentColor" />
          <path d="M12 12l5 9.5" stroke="currentColor" strokeWidth={2} />
        </>
      )
    case 'clock':
      return (
        <>
          <circle cx="12" cy="12" r="9" {...STROKE} />
          <path d="M12 7v5l3.5 2" {...STROKE} strokeLinecap="round" />
        </>
      )
    case 'flame':
      return (
        <path
          d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2.4 1.2-4 2.5-5 .2 2 1.3 3 2.5 3-1-3 0-6 0-9z"
          fill="currentColor"
        />
      )
  }
}

interface TrophyGlyphProps {
  trophyId: TrophyId
  className?: string
}

/** The trophy's icon, drawn in `currentColor`. */
export function TrophyGlyph({ trophyId, className }: TrophyGlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <GlyphPaths name={TROPHY_LOOKS[trophyId].glyph} />
    </svg>
  )
}
