import type { CharmId } from '@storix/shared'

interface CharmIconProps {
  charm: CharmId
  className?: string
}

/** The porte-bonheur pictogram of a charm, drawn in currentColor. */
export function CharmIcon({ charm, className }: CharmIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      {charm === 'trefle' || charm === 'trefle-or' ? (
        <>
          <circle cx="8.5" cy="8.5" r="4" fill="currentColor" />
          <circle cx="15.5" cy="8.5" r="4" fill="currentColor" />
          <circle cx="8.5" cy="15.5" r="4" fill="currentColor" />
          <circle cx="15.5" cy="15.5" r="4" fill="currentColor" />
          <path d="M12 12l5 9.5" stroke="currentColor" strokeWidth="2" />
        </>
      ) : null}
      {charm === 'boussole' ? (
        <>
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M15.5 8.5l-2 5-5 2 2-5z" fill="currentColor" />
        </>
      ) : null}
      {charm === 'aimant' ? (
        <>
          <path
            d="M5 3.5h4v8a3 3 0 0 0 6 0v-8h4v8a7 7 0 0 1-14 0z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M5 8h4M15 8h4" stroke="currentColor" strokeWidth="2" />
        </>
      ) : null}
      {charm === 'eclat' ? (
        <path d="M12 2l2 7.5L21.5 12 14 14.5 12 22l-2-7.5L2.5 12 10 9.5z" fill="currentColor" />
      ) : null}
      {charm === 'tamis' ? (
        <>
          <path
            d="M3 8h18l-3 9H6z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M9 11.5v2M12 11.5v2M15 11.5v2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="20.5" r="1.3" fill="currentColor" />
        </>
      ) : null}
    </svg>
  )
}
