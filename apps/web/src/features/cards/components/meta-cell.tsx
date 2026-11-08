import type { ReactNode } from 'react'
import type { CardPerson } from '@storix/shared'

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })

export function formatDate(value: string | null, fallback: string): string {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : DATE_FORMAT.format(date)
}

export function discovererLabel(person: CardPerson | null): string {
  if (!person) return 'Personne encore'
  return person.displayUsername ?? 'Ancien membre'
}

interface MetaCellProps {
  label: string
  value: string
  leading?: ReactNode
}

export function MetaCell({ label, value, leading }: MetaCellProps) {
  return (
    <div className="meta-cell">
      <p className="meta-k">{label}</p>
      {leading ? (
        <div className="mt-1 flex min-w-0 items-center gap-2">
          {leading}
          <p className="meta-v !m-0 min-w-0 truncate">{value}</p>
        </div>
      ) : (
        <p className="meta-v">{value}</p>
      )}
    </div>
  )
}
