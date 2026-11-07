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

export function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta-cell">
      <p className="meta-k">{label}</p>
      <p className="meta-v">{value}</p>
    </div>
  )
}
