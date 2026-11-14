import type { EmblemId } from '@storix/shared'

const EMBLEM_PATHS: Record<EmblemId, readonly string[]> = {
  'first-booster': [
    'M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z',
    'M6 7h12M6 17h12',
  ],
  'first-photo': ['M4 8h3l2-3h6l2 3h3v11H4z', 'M12 9.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z'],
  photographer: [
    'M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
    'm4 16 5-5 4 4 2-2 5 5',
  ],
  collector: ['M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z', 'M5 17a3 3 0 0 1 3-3h10'],
  'fan-club': ['M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z'],
  golden: [
    'M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z',
    'M12 8.5c.4 2 1.3 2.9 3.3 3.3-2 .4-2.9 1.3-3.3 3.3-.4-2-1.3-2.9-3.3-3.3 2-.4 2.9-1.3 3.3-3.3Z',
  ],
  discoverer: ['M11 5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z', 'm20 20-4.5-4.5'],
  shiny: ['M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7Z'],
  crush: [
    'M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.6 2.2-4.6.3 1.4 1 2.4 2 2.8C11 9 11.2 5.8 12 3Z',
  ],
  stacker: ['M4 8 12 4l8 4-8 4z', 'm4 12 8 4 8-4M4 16l8 4 8-4'],
  upgrader: ['M12 19V6M6 11l6-6 6 6'],
  legend: ['M4 18h16l-1.5-10-4.5 4-2-6-2 6-4.5-4z'],
  archivist: [
    'M5 4h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z',
    'M14 4h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z',
    'M5 13h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1Z',
    'M14 16.5l2 2 3.5-4',
  ],
  mythic: ['M6 4h12l3 5-9 11L3 9z', 'M3 9h18M9 4l3 16 3-16'],
  muse: [
    'M12 5a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z',
    'M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5',
    'M18 3l.6 1.6L20 5l-1.4.6L18 7l-.6-1.4L16 5l1.4-.4z',
  ],
  'on-time': ['M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z', 'M12 8v4l2.5 2.5', 'M13 1.5l-2 3h3l-2 3'],
  'series-complete': ['M4 6h7v7H4zM13 6h7v7h-7z', 'M4 15h7v5H4z', 'M14 17.5l2 2 4-4.5'],
}

interface EmblemIconProps {
  id: EmblemId
  className?: string
}

/** Line glyph of an emblem, drawn in the current colour. */
export function EmblemIcon({ id, className }: EmblemIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {EMBLEM_PATHS[id].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
